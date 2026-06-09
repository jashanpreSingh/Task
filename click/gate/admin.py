from django.contrib import admin

from .models import GatePass, Structure


@admin.register(GatePass)
class GatePassAdmin(admin.ModelAdmin):
    list_display = ('pass_no', 'direction', 'entry_type', 'category', 'name', 'status', 'created_at')
    list_filter = ('direction', 'entry_type', 'status')
    search_fields = ('pass_no', 'name', 'phone', 'reference')


@admin.register(Structure)
class StructureAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'updated_at')
