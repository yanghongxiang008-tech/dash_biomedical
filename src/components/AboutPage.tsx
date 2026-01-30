import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Linkedin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

const AboutPage = () => {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 animate-fade-in">
      <div className="max-w-4xl mx-auto pt-20">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-heading font-normal">{t("About AI/Tech Daily")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-muted-foreground">
                {t("AI/Tech Daily is a simple and elegant tool designed to help track and analyze stock market movements in the AI and technology sectors. It provides real-time insights, historical data, and personalized notes to support your investment decisions.")}
              </p>
              <p className="text-muted-foreground">
                {t("This is a lightweight utility built with a focus on clarity and ease of use, perfect for investors who want quick access to key market information.")}
              </p>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold">{t("Contact Information")}</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="font-medium">{t("WeChat:")}</span>
                    <span className="text-muted-foreground">Tzzzz0110</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Linkedin className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{t("LinkedIn:")}</span>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => window.open('https://www.linkedin.com/in/zezhou-tang/', '_blank')}
                  >
                    https://www.linkedin.com/in/zezhou-tang/
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <p className="text-xs text-muted-foreground">
                {t("Version 1.0.0")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutPage;
