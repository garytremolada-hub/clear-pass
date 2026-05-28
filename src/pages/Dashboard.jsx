import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
    const navigate = useNavigate();

    const handleBuild = () => {
        navigate('/chat', { state: { quickPrompt: 'I want to build a new assessment from a UoC.', cohort: true } });
    };

    const handleEvaluate = () => {
        navigate('/chat', { state: { quickPrompt: 'I want to evaluate an existing assessment against a UoC.', cohort: true } });
    };

    const handleScore = () => {
        navigate('/chat', { state: { quickPrompt: 'I want to score some text for readability.', cohort: false } });
    };

    return (
        <div className="flex-1 overflow-y-auto bg-white">
            <div className="min-h-full flex flex-col items-center justify-between px-6 py-16">

                {/* Main content */}
                <div className="w-full max-w-xl flex flex-col items-center text-center space-y-6">

                    {/* Heading */}
                    <h1 className="text-4xl font-bold text-[#1e3a5f] leading-tight">
                        Build audit-ready assessments in minutes
                    </h1>

                    {/* Subtitle */}
                    <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                        Upload your Unit of Competency. We build a complete, compliant assessment — written at the right level for your learners, mapped to every requirement.
                    </p>

                    {/* Primary CTA */}
                    <Button
                        size="lg"
                        className="bg-[#1e3a5f] hover:bg-[#152d4d] text-white px-8 py-6 text-base font-semibold rounded-xl shadow-md mt-2"
                        onClick={handleBuild}
                    >
                        Upload your UoC and get started
                    </Button>

                    {/* Secondary links */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6 text-sm">
                        <button
                            onClick={handleEvaluate}
                            className="text-[#1e3a5f] hover:underline font-medium flex items-center gap-1"
                        >
                            Check an existing assessment →
                        </button>
                        <button
                            onClick={handleScore}
                            className="text-[#1e3a5f] hover:underline font-medium flex items-center gap-1"
                        >
                            Score a document for readability →
                        </button>
                    </div>
                </div>

                {/* Trust indicators */}
                <div className="w-full max-w-2xl mt-20">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        {[
                            { icon: ClipboardList, text: 'Mapped to AQF levels 1–10' },
                            { icon: CheckSquare,   text: 'Evidence coverage checked automatically' },
                            { icon: FileText,      text: 'Exports as Word document' },
                        ].map(item => (
                            <div key={item.text} className="flex flex-col items-center gap-2 text-muted-foreground">
                                <item.icon className="h-5 w-5 text-[#1e3a5f]/60" />
                                <span className="text-xs leading-snug">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}