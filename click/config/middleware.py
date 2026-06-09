"""Custom middleware for the Gate Management project."""
from django.conf import settings


class FrameAncestorsMiddleware:
    """Allow the gate app to be embedded as an iframe by trusted parents only.

    Replaces Django's X-Frame-Options (which can only say DENY/SAMEORIGIN) with a
    Content-Security-Policy ``frame-ancestors`` rule, so Team Board can embed the
    gate app even though it is served from a different origin. The allowed parents
    are configured via the GATE_FRAME_ANCESTORS setting.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.ancestors = ' '.join(getattr(settings, 'GATE_FRAME_ANCESTORS', ["'self'"]))

    def __call__(self, request):
        response = self.get_response(request)
        # Drop X-Frame-Options so it does not block cross-origin framing.
        response.headers.pop('X-Frame-Options', None)
        response['Content-Security-Policy'] = f'frame-ancestors {self.ancestors}'
        return response
