import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/language";
import lineQrCodePath from "@assets/line-qr-code.png";

interface LineConfirmationProps {
  applicationId: string;
  onConfirm: () => void;
  onBack: () => void;
}

export function LineConfirmation({ applicationId, onConfirm, onBack }: LineConfirmationProps) {
  const { t } = useLanguage();
  const lineUrl = "https://line.me/R/ti/p/@334ewksn?oat_content=url&ts=07291320";

  const handleLineLink = () => {
    window.open(lineUrl, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600 mr-2" />
          <h2 className="text-2xl font-semibold text-slate-800">{t('line.title')}</h2>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        <div className="text-slate-700 space-y-4">
          <div className="flex items-start space-x-3">
            <span className="text-blue-600 font-semibold text-lg">1.</span>
            <p>{t('line.step1')}</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-blue-600 font-semibold text-lg">2.</span>
            <p>{t('line.step2')}</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-blue-600 font-semibold text-lg">3.</span>
            <p>{t('line.step3')}</p>
          </div>
          <div className="flex items-start space-x-3">
            <span className="text-blue-600 font-semibold text-lg">4.</span>
            <p>{t('line.step4')}</p>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-lg border-2 border-slate-200 shadow-sm">
                <img 
                  src={lineQrCodePath} 
                  alt="LINE QR Code" 
                  className="w-48 h-48 object-contain"
                />
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-3">
              {t('line.qrInstructions')}
            </p>
            <div className="text-center">
              <Button 
                onClick={handleLineLink}
                variant="outline"
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('line.addViaLink')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}