const FarmStatusCard = ({
  area,
  trees,
  production,
}: {
  area: number | null;
  trees: number | null;
  production: number | null;
}) => {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 w-full text-center gap-4 p-6 bg-slate-50 rounded-lg">
      <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700">Farm Area</h3>
        <p className="text-xl font-bold text-green-600">{area}</p>
      </div>
      <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700">Number of Trees</h3>
        <p className="text-xl font-bold text-green-600">{trees}</p>
      </div>
      <div className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700">Quantity</h3>
        <p className="text-xl font-bold text-green-600">{production} kg</p>
      </div>
    </div>
  );
};

export default FarmStatusCard;
