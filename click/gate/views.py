import json
import random

from django.http import JsonResponse, HttpResponseBadRequest, HttpResponseNotFound
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import GatePass, Structure


def index(request):
    return render(request, 'gate/index.html')


# ---------------- structure (menu grid) ----------------
@csrf_exempt
def api_structure(request):
    s = Structure.get_solo()
    if request.method == 'GET':
        return JsonResponse({'headers': s.headers, 'rows': s.rows})
    if request.method in ('POST', 'PUT'):
        try:
            data = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return HttpResponseBadRequest('Invalid JSON')
        s.headers = data.get('headers', s.headers)
        s.rows = data.get('rows', s.rows)
        s.save()
        return JsonResponse({'ok': True})
    return HttpResponseBadRequest('Unsupported method')


# ---------------- records ----------------
def _gen_pass_no():
    for _ in range(20):
        pn = 'GP' + str(random.randint(100000, 999999))
        if not GatePass.objects.filter(pass_no=pn).exists():
            return pn
    return 'GP' + str(random.randint(1000000, 9999999))


@csrf_exempt
def api_records(request):
    if request.method == 'GET':
        return JsonResponse({'records': [r.to_dict() for r in GatePass.objects.all()]})
    if request.method == 'POST':
        try:
            data = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return HttpResponseBadRequest('Invalid JSON')
        name = (data.get('name') or '').strip()
        if not name:
            return HttpResponseBadRequest('name is required')
        rec = GatePass.objects.create(
            pass_no=_gen_pass_no(),
            direction=data.get('dir', ''),
            entry_type=data.get('type', ''),
            category=data.get('category', ''),
            path_str=data.get('pathStr', ''),
            name=name,
            phone=data.get('phone', ''),
            reference=data.get('reference', ''),
            details=data.get('details', ''),
            in_time=data.get('inTime', ''),
            remarks=data.get('remarks', ''),
            status='Out' if 'out' in (data.get('dir', '') or '').lower() else 'Inside',
        )
        return JsonResponse(rec.to_dict())
    return HttpResponseBadRequest('Unsupported method')


@csrf_exempt
def api_record_detail(request, pass_no):
    try:
        rec = GatePass.objects.get(pass_no=pass_no)
    except GatePass.DoesNotExist:
        return HttpResponseNotFound('Not found')
    if request.method == 'DELETE':
        rec.delete()
        return JsonResponse({'ok': True})
    if request.method == 'POST':  # close gate pass
        rec.status = 'Out'
        rec.out_time = timezone.now()
        rec.save()
        return JsonResponse(rec.to_dict())
    return HttpResponseBadRequest('Unsupported method')


@csrf_exempt
def api_records_clear(request):
    if request.method == 'POST':
        GatePass.objects.all().delete()
        return JsonResponse({'ok': True})
    return HttpResponseBadRequest('Unsupported method')
