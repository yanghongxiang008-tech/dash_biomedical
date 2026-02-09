import React from 'react';
import Navigation from '@/components/Navigation';
import PageHeader from '@/components/PageHeader';
import { useI18n } from '@/i18n';
import Footer from '@/components/Footer';

const GlobalSummary = () => {
    const { t } = useI18n();

    return (
        <div className="min-h-screen bg-background flex flex-col pt-16 sm:pt-20 lg:pt-24">
            {/* Page Header */}
            <PageHeader />

            {/* Navigation */}
            <Navigation activeTab="summary" />

            {/* Main Content - Full Height Iframe */}
            <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pb-8">
                <div className="w-full h-[calc(100vh-180px)] rounded-2xl border border-border/50 overflow-hidden bg-muted/20 shadow-inner group transition-all duration-300">
                    <iframe
                        src="http://118.193.47.247:8004/"
                        className="w-full h-full border-0"
                        title="Global Summary Dashboard"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>

                {/* Helper text for mixed content */}
                <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground italic">
                        {t("If the summary doesn't load, it may be due to browser security settings for HTTP content.")}
                    </p>
                    <a
                        href="http://118.193.47.247:8004/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                        {t("Open in new tab instead")}
                    </a>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default GlobalSummary;
