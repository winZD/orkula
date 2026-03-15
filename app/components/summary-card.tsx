import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export function SummaryCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="bg-cream">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-forest/60">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
