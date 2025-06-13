import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
    </div>
  );
}