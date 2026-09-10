import React from 'react';
import { PropertyItem } from '../types';
import { propVerified, propRating, shortDate } from '../lib/supabase';
import { AlertOctagon, CheckCircle2, Eye, Phone, RefreshCw, Star } from 'lucide-react';

interface UnverifiedPropertiesViewProps {
  properties: PropertyItem[];
  onOpenPreview: (property: PropertyItem) => void;
  onVerifyProperty: (property: PropertyItem) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const UnverifiedPropertiesView: React.FC<UnverifiedPropertiesViewProps> = ({
  properties,
  onOpenPreview,
  onVerifyProperty,
  onRefresh,
  isRefreshing,
}) => {
  const unverifiedList = properties.filter((p) => !propVerified(p));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-serif font-extrabold text-white">Unverified Properties Queue</h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
              {unverifiedList.length} Awaiting Verification
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Hostel, Tiffin, Library, Cafe और Bookstore की unverified listings — inspect and grant official Director verification badge.
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      <div className="rounded-3xl bg-[#081026] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1838] text-amber-300 font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">Property</th>
                <th className="p-4">Type / Category</th>
                <th className="p-4">Owner Name</th>
                <th className="p-4">Locality / Area</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Listing Status</th>
                <th className="p-4">Verification Status</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Updated</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {unverifiedList.length ? (
                unverifiedList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-white">
                      {item.name || 'Unnamed Property'}
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">#{item.id}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-blue-300 border border-blue-500/20">
                        {item.category || 'Hostel'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">{item.owner_name || '—'}</td>
                    <td className="p-4 text-slate-300">{item.area || 'Kota'}</td>
                    <td className="p-4 font-mono text-slate-300">
                      {item.phone ? (
                        <a href={`tel:${item.phone}`} className="hover:text-amber-300 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.phone}</span>
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {item.status || 'pending'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/25">
                        <AlertOctagon className="w-3 h-3" />
                        Unverified
                      </span>
                    </td>
                    <td className="p-4 text-amber-300 font-bold">
                      {propRating(item) > 0 ? (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-300" /> {propRating(item)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-4 text-slate-400">{shortDate(item.updated_at || item.created_at)}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onOpenPreview(item)}
                          className="px-3 py-1.5 rounded-lg bg-[#0d1838] hover:bg-[#14224d] text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                        <button
                          onClick={() => onVerifyProperty(item)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    All properties have been reviewed and verified. No unverified listings in the queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
