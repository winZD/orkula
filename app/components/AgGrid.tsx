import React from "react";
import { AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import type { AgGridReactProps } from "ag-grid-react";

ModuleRegistry.registerModules([AllCommunityModule]);

// AgGrid Wrapper Component
export const AgGrid: React.FC<AgGridReactProps> = ({
  rowData,
  enableBrowserTooltips = true,
  columnDefs,
  domLayout = "autoHeight",
  defaultColDef = { flex: 1 },
  suppressRowHoverHighlight = true,
  suppressCellFocus = true,
  overlayNoRowsTemplate = "Nema podataka",
  ...props
}) => {
  return (
    <div className={`${props.className || ""} ag-theme-quartz flex-1`}>
      <AgGridReact
        domLayout={domLayout}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        suppressRowHoverHighlight={suppressRowHoverHighlight}
        suppressCellFocus={suppressCellFocus}
        overlayNoRowsTemplate={overlayNoRowsTemplate}
        enableBrowserTooltips={enableBrowserTooltips}
        {...props} // Spread other props to allow further customization if needed
      />{" "}
    </div>
  );
};
