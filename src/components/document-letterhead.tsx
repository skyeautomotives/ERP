type Company = {
  name: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  logo_url: string | null;
};

// Printable documents (invoices, receipts, etc.) render as a plain "paper"
// surface, deliberately not theme-aware - always-light classes so the
// document reads the same on screen and on paper, regardless of the app's
// dark mode.
export function DocumentLetterhead({ company }: { company: Company | null }) {
  if (!company) return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
      {company.logo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={company.logo_url} alt="" className="h-12 w-12 shrink-0 object-contain" />
      )}
      <div>
        <p className="text-base font-semibold text-gray-900">{company.name}</p>
        {company.address && <p className="text-xs text-gray-600">{company.address}</p>}
        <p className="text-xs text-gray-600">
          {company.gstin && <>GSTIN: {company.gstin}</>}
          {company.gstin && company.phone && <> &middot; </>}
          {company.phone && <>Ph: {company.phone}</>}
        </p>
      </div>
    </div>
  );
}
