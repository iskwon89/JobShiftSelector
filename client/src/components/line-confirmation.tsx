import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, CheckCircle } from "lucide-react";
import lineQrCodePath from "@assets/line-qr-code.png";

interface LineConfirmationProps {
  applicationId: string;
  onConfirm: () => void;
  onBack: () => void;
}

export function LineConfirmation({ applicationId, onConfirm, onBack }: LineConfirmationProps) {
  const lineUrl = "https://line.me/R/ti/p/@334ewksn?oat_content=url&ts=07291320";

  const handleLineLink = () => {
    window.open(lineUrl, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 mr-2" />
          <h2 className="text-2xl font-semibold text-slate-800">Application Submitted!</h2>
        </div>
        <p className="text-center text-slate-600">
          Your application ID is: <span className="font-mono font-semibold text-slate-800">{applicationId}</span>
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
              Add Our Organization on LINE
            </h3>
            <p className="text-slate-600 text-sm mb-4">
              Please add our organization on LINE to receive important updates about your application and work schedules.
            </p>
          </div>

          <div className="space-y-6">
            {/* QR Code Section */}
            <div className="text-center">
              <h4 className="font-semibold text-slate-700 mb-3">Scan QR Code</h4>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-lg border-2 border-slate-200 shadow-sm">
                  <img 
                    src={lineQrCodePath} 
                    alt="LINE QR Code" 
                    className="w-48 h-48 object-contain"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Open LINE app and scan this QR code to add our organization
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or</span>
              </div>
            </div>

            {/* Link Section */}
            <div className="text-center">
              <h4 className="font-semibold text-slate-700 mb-3">Add via Link</h4>
              <Button 
                onClick={handleLineLink}
                variant="outline"
                className="w-full sm:w-auto border-green-500 text-green-600 hover:bg-green-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open LINE and Add Organization
              </Button>
              <p className="text-xs text-slate-500 mt-2">
                This will open LINE in a new tab/app
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Notice */}
      <Card className="mb-6 bg-yellow-50 border-yellow-200">
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div>
              <h4 className="font-semibold text-yellow-800 text-sm">Important</h4>
              <p className="text-yellow-700 text-sm mt-1">
                Adding our organization on LINE is required to receive work schedules, 
                shift updates, and important announcements. Please make sure to complete this step.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <Button
          onClick={onBack}
          variant="outline"
          className="order-2 sm:order-1"
        >
          Back to Contact Info
        </Button>
        <Button
          onClick={onConfirm}
          className="order-1 sm:order-2 flex-1"
        >
          I've Added the Organization
        </Button>
      </div>
    </div>
  );
}