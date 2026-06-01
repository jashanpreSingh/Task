from rest_framework import serializers

from .models import DailyError, ITAISubscription, ITAccount, ITDomain, ITEmployee, ITProject, ITRisk, ITServer, Message, Profile, Project, Standup, Task


class TaskSerializer(serializers.ModelSerializer):
    blocked = serializers.SerializerMethodField()
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id',
            'task',
            'owner',
            'assigned_to',
            'assigned_to_username',
            'assigned_to_name',
            'project',
            'project_name',
            'work_date',
            'start_time',
            'end_time',
            'status',
            'blocker',
            'blocked',
            'updated_at',
            'created_at',
        ]

    def get_blocked(self, obj):
        return obj.status == 'Blocked'

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to:
            return obj.owner
        profile = getattr(obj.assigned_to, 'profile', None)
        return profile.display_name if profile and profile.display_name else obj.assigned_to.username


class ProjectSerializer(serializers.ModelSerializer):
    owner_name = serializers.SerializerMethodField()
    task_count = serializers.IntegerField(source='tasks.count', read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'name', 'description', 'owner', 'owner_name', 'is_active', 'task_count', 'created_at', 'updated_at']

    def get_owner_name(self, obj):
        if not obj.owner:
            return ''
        profile = getattr(obj.owner, 'profile', None)
        return profile.display_name if profile and profile.display_name else obj.owner.username


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = Profile
        fields = ['user_id', 'username', 'display_name', 'role']


class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.StringRelatedField(read_only=True)
    sender_role = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_role', 'recipient', 'recipient_name', 'content', 'audience', 'work_date', 'created_at']

    def get_sender_role(self, obj):
        profile = getattr(obj.sender, 'profile', None)
        return profile.role if profile else 'Member'

    def get_recipient_name(self, obj):
        if not obj.recipient:
            return ''
        profile = getattr(obj.recipient, 'profile', None)
        return profile.display_name if profile and profile.display_name else obj.recipient.username


class StandupSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    username = serializers.CharField(source='user.username', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Standup
        fields = [
            'id',
            'user',
            'username',
            'user_name',
            'project',
            'project_name',
            'work_date',
            'yesterday',
            'today',
            'blocker',
            'review_status',
            'review_note',
            'reviewed_by',
            'reviewed_by_name',
            'reviewed_at',
            'created_at',
        ]
        read_only_fields = ['user', 'reviewed_by', 'reviewed_at']

    def get_user_name(self, obj):
        profile = getattr(obj.user, 'profile', None)
        return profile.display_name if profile and profile.display_name else obj.user.username

    def get_reviewed_by_name(self, obj):
        if not obj.reviewed_by:
            return ''
        profile = getattr(obj.reviewed_by, 'profile', None)
        return profile.display_name if profile and profile.display_name else obj.reviewed_by.username


class DailyErrorSerializer(serializers.ModelSerializer):
    reporter_name = serializers.SerializerMethodField()
    reporter_username = serializers.CharField(source='reported_by.username', read_only=True)

    class Meta:
        model = DailyError
        fields = [
            'id',
            'title',
            'application',
            'environment',
            'severity',
            'status',
            'occurrence_count',
            'work_date',
            'reported_by',
            'reporter_name',
            'reporter_username',
            'symptoms',
            'root_cause',
            'solution',
            'prevention',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['reported_by']

    def get_reporter_name(self, obj):
        if not obj.reported_by:
            return 'Unknown'
        profile = getattr(obj.reported_by, 'profile', None)
        return profile.display_name if profile and profile.display_name else obj.reported_by.username


class ITProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITProject
        fields = '__all__'


class ITServerSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITServer
        fields = '__all__'


class ITDomainSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITDomain
        fields = '__all__'


class ITAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITAccount
        fields = '__all__'


class ITEmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITEmployee
        fields = '__all__'


class ITAISubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITAISubscription
        fields = '__all__'


class ITRiskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ITRisk
        fields = '__all__'
