from django.db import models

# Default menu structure (table form): each row is one menu path,
# each column is one level (Gate -> Entry Type -> Category -> ...).
DEFAULT_HEADERS = ["Gate", "Entry Type", "Category"]
DEFAULT_ROWS = [
    ["Gate In", "Person Entry", "Visitor"],
    ["Gate In", "Person Entry", "Labour"],
    ["Gate In", "Person Entry", "Employee"],
    ["Gate In", "Person Entry", "Driver"],
    ["Gate In", "Vehicle Entry", "Empty Vehicle"],
    ["Gate In", "Vehicle Entry", "Loaded Vehicle"],
    ["Gate In", "Vehicle Entry", "Transport Vehicle"],
    ["Gate In", "Material Entry", "Raw Material"],
    ["Gate In", "Material Entry", "Finished Goods"],
    ["Gate In", "Material Entry", "Returnable Material"],
    ["Gate In", "Material Entry", "Non-Returnable Material"],
    ["Gate Out", "Search Active Gate Pass", ""],
    ["Gate Out", "Verify Person / Vehicle / Material", ""],
    ["Gate Out", "Security Check", ""],
    ["Gate Out", "Close Gate Pass", ""],
]


class Structure(models.Model):
    """Singleton holding the editable menu grid (headers + rows)."""
    headers = models.JSONField(default=list)
    rows = models.JSONField(default=list)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Structure"

    def __str__(self):
        return f"Structure ({len(self.rows)} rows, {len(self.headers)} columns)"

    @classmethod
    def get_solo(cls):
        obj = cls.objects.first()
        if obj is None:
            obj = cls.objects.create(headers=DEFAULT_HEADERS, rows=DEFAULT_ROWS)
        return obj


class GatePass(models.Model):
    pass_no = models.CharField(max_length=20, unique=True, db_index=True)
    direction = models.CharField(max_length=50, blank=True)      # Gate In / Gate Out
    entry_type = models.CharField(max_length=100, blank=True)    # Person Entry ...
    category = models.CharField(max_length=120, blank=True)      # Visitor ...
    path_str = models.CharField(max_length=400, blank=True)      # full menu path
    name = models.CharField(max_length=200)                      # name / item
    phone = models.CharField(max_length=80, blank=True)
    reference = models.CharField(max_length=120, blank=True)
    details = models.TextField(blank=True)
    in_time = models.CharField(max_length=40, blank=True)
    remarks = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='Inside')   # Inside / Out
    out_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.pass_no} - {self.name}"

    def to_dict(self):
        return {
            'id': self.pass_no,
            'dir': self.direction,
            'type': self.entry_type,
            'category': self.category,
            'pathStr': self.path_str,
            'name': self.name,
            'phone': self.phone,
            'reference': self.reference,
            'details': self.details,
            'time': self.created_at.strftime('%d %b %Y, %I:%M %p'),
            'status': self.status,
        }
