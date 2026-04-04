import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function SummaryCard({ title, value, valueClassName }: { title: string; value: string | number; valueClassName?: string }) {
  return (
    <Card className="bg-cream">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-forest/60">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${valueClassName ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
