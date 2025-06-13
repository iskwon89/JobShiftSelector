import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Send, Clock, CheckCircle, XCircle, AlertCircle, Eye, MessageSquare, Settings } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LineNotification {
  id: number;
  applicationId: number;
  employeeId: string;
  lineId: string;
  message: string;
  scheduledFor: string;
  sentAt: string | null;
  status: string;
  response: string | null;
  createdAt: string;
}

export function LineNotifications() {
  const { toast } = useToast();
  
  // Message template state
  const [messageTemplate, setMessageTemplate] = useState(`🔔 Shift Reminder 🔔

Hello {{name}}!

You have an upcoming shift scheduled:
📍 Location: {{location}}
📅 Date: {{date}}
⏰ Time: {{time}} ({{shift}})

Please arrive 15 minutes early for briefing.

For any questions, contact HR at:
📧 hr@couflex.com
📞 +886-2-1234-5678

Thank you!
Couflex Team`);

  // Manual message state
  const [manualLineId, setManualLineId] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [previewMessage, setPreviewMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  // Validation helper
  const isValidLineId = (lineId: string) => {
    const trimmed = lineId.trim();
    // LINE ID can be user-friendly (4-20 chars) or internal user ID (U + 32 chars)
    const isUserFriendlyId = trimmed.length >= 4 && trimmed.length <= 20;
    const isInternalUserId = trimmed.startsWith('U') && trimmed.length === 33;
    return isUserFriendlyId || isInternalUserId;
  };
  
  const { data: notifications = [], isLoading, refetch } = useQuery<LineNotification[]>({
    queryKey: ['/api/admin/line-notifications'],
  });

  const processNotificationsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/line-notifications/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to process notifications');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Pending notifications processed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/line-notifications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process notifications",
        variant: "destructive",
      });
    },
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (template: string) => {
      const response = await fetch('/api/admin/line-notifications/template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });
      if (!response.ok) throw new Error('Failed to save template');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Message template saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      });
    },
  });

  const sendManualMessageMutation = useMutation({
    mutationFn: async ({ lineId, date }: { lineId: string; date: string }) => {
      const response = await fetch('/api/admin/line-notifications/send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId, date }),
      });
      if (!response.ok) throw new Error('Failed to send manual message');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Manual message sent successfully",
      });
      setManualLineId('');
      setManualDate('');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/line-notifications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send manual message",
        variant: "destructive",
      });
    },
  });

  const previewTemplateMutation = useMutation({
    mutationFn: async ({ template, lineId, date }: { template: string; lineId: string; date: string }) => {
      const response = await fetch('/api/admin/line-notifications/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template, lineId, date }),
      });
      if (!response.ok) throw new Error('Failed to generate preview');
      return response.json();
    },
    onSuccess: (data) => {
      setPreviewMessage(data.message);
      setShowPreview(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate preview",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Taipei'
    });
  };

  const pendingCount = notifications.filter(n => n.status === 'pending').length;
  const sentCount = notifications.filter(n => n.status === 'sent').length;
  const failedCount = notifications.filter(n => n.status === 'failed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LINE Notifications</h1>
          <p className="text-muted-foreground">
            Manage shift reminder notifications sent via LINE
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => processNotificationsMutation.mutate()}
            disabled={processNotificationsMutation.isPending || pendingCount === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            Process Pending ({pendingCount})
          </Button>
        </div>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="history">Notification History</TabsTrigger>
          <TabsTrigger value="template">Message Template</TabsTrigger>
          <TabsTrigger value="manual">Manual Send</TabsTrigger>
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{notifications.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sent Successfully</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{sentCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications List */}
          <Card>
            <CardHeader>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>
                Recent LINE notifications with their status and details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notifications found
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div className="flex items-start justify-between py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            {getStatusBadge(notification.status)}
                            <span className="font-medium">Employee ID: {notification.employeeId}</span>
                            <span className="text-sm text-muted-foreground">
                              App #{notification.applicationId}
                            </span>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <div><strong>LINE ID:</strong> {notification.lineId}</div>
                            <div><strong>Scheduled for:</strong> {formatDate(notification.scheduledFor)}</div>
                            {notification.sentAt && (
                              <div><strong>Sent at:</strong> {formatDate(notification.sentAt)}</div>
                            )}
                            <div><strong>Created:</strong> {formatDate(notification.createdAt)}</div>
                          </div>
                          
                          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                            <div className="text-sm font-medium mb-1">Message:</div>
                            <div className="text-sm whitespace-pre-wrap">{notification.message}</div>
                          </div>
                          
                          {notification.response && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                              <div className="text-sm font-medium mb-1">Response:</div>
                              <div className="text-sm">{notification.response}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Template Tab */}
        <TabsContent value="template" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Message Template</CardTitle>
              <CardDescription>
                Customize the notification message template using macro notation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="template">Template Message</Label>
                <Textarea
                  id="template"
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  rows={12}
                  className="font-mono"
                  placeholder="Enter message template with macros"
                />
                <div className="text-sm text-muted-foreground">
                  Available macros: name, location, date, time, shift
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => saveTemplateMutation.mutate(messageTemplate)}
                  disabled={saveTemplateMutation.isPending}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Send Tab */}
        <TabsContent value="manual" className="space-y-6">
          {/* Instructions Card */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800 dark:text-blue-200">How to Get LINE User IDs</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-700 dark:text-blue-300">
              <div className="space-y-2">
                <p><strong>LINE ID Format:</strong> User-friendly LINE IDs are 4-20 characters long</p>
                <p><strong>Examples:</strong> "john123", "@mycompany", "employee001"</p>
                <p><strong>How to find:</strong> Users can set their LINE ID in LINE app settings, or you can ask employees to share their LINE ID</p>
                <p><strong>Note:</strong> LINE IDs are optional - not all users have one set up</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Manual Message</CardTitle>
                <CardDescription>
                  Send notification manually to specific LINE ID for a date
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lineId">LINE ID</Label>
                  <Input
                    id="lineId"
                    value={manualLineId}
                    onChange={(e) => setManualLineId(e.target.value)}
                    placeholder="username or @username"
                  />
                  <div className="text-xs text-muted-foreground">
                    Enter LINE ID (4-20 characters, e.g., "username" or "@username")
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="date">Date (format: Mon, Jun 16)</Label>
                  <Input
                    id="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    placeholder="Mon, Jun 16"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => previewTemplateMutation.mutate({ 
                      template: messageTemplate, 
                      lineId: manualLineId, 
                      date: manualDate 
                    })}
                    disabled={!manualLineId || !manualDate || previewTemplateMutation.isPending}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  
                  <Button
                    onClick={() => sendManualMessageMutation.mutate({ 
                      lineId: manualLineId, 
                      date: manualDate 
                    })}
                    disabled={!isValidLineId(manualLineId) || !manualDate || sendManualMessageMutation.isPending}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Now
                  </Button>
                  
                {!isValidLineId(manualLineId) && manualLineId.length > 0 && (
                  <div className="text-sm text-red-600 mt-2">
                    Invalid LINE ID format. Must be 4-20 characters long.
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

            {showPreview && (
              <Card>
                <CardHeader>
                  <CardTitle>Message Preview</CardTitle>
                  <CardDescription>
                    Preview of the message that will be sent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border">
                    <div className="text-sm whitespace-pre-wrap">{previewMessage}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowPreview(false)}
                  >
                    Close Preview
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}