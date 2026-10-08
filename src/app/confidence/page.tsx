import { DiagnosisView } from "@/components/diagnosis-view";

export const metadata = {
  title: "自信度診断",
};

export default function ConfidencePage() {
  return <DiagnosisView testId="confidence" />;
}
