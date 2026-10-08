import { DiagnosisView } from "@/components/diagnosis-view";

export const metadata = {
  title: "解離傾向チェック",
};

export default function DissociationPage() {
  return <DiagnosisView testId="dissociation" />;
}
