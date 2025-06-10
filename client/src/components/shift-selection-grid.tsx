import { useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { ShiftSelection, ShiftData } from "@shared/schema";

interface UserData {
  id: string;
  name: string;
  cohort: string;
}

interface ShiftSelectionGridProps {
  userData: UserData;
  onShiftsSelected: (shifts: ShiftSelection[]) => void;
  onBack: () => void;
}

export function ShiftSelectionGrid({ userData, onShiftsSelected, onBack }: ShiftSelectionGridProps) {
  const [selectedShifts, setSelectedShifts] = useState<ShiftSelection[]>([]);
  const [shiftSelections, setShiftSelections] = useState<Record<string, ShiftSelection>>({});
  const { toast } = useToast();

  const { data: shiftData, isLoading } = useQuery<ShiftData[]>({
    queryKey: ['/api/shift-data', userData.cohort],
    queryFn: async () => {
      const response = await fetch(`/api/shift-data/${userData.cohort}`);
      if (!response.ok) throw new Error('Failed to fetch shift data');
      return response.json();
    }
  });

  // Extract unique locations and dates from the fetched shift data
  const locations = shiftData ? Array.from(new Set(shiftData.map(s => s.location))).sort() : [];
  const dates = shiftData ? Array.from(new Set(shiftData.map(s => s.date))).sort() : [];
  const shifts = ['DS', 'SS'];

  const getShiftRate = (location: string, date: string, shift: string) => {
    if (!shiftData) return '1x';
    const shiftEntry = shiftData.find(
      s => s.location === location && s.date === date && s.shift === shift
    );
    return shiftEntry?.rate || '1x';
  };

  const getShiftCapacity = (location: string, date: string, shift: string) => {
    if (!shiftData) return { capacity: 10, currentBookings: 0, remaining: 10 };
    const shiftEntry = shiftData.find(
      s => s.location === location && s.date === date && s.shift === shift
    );
    const capacity = shiftEntry?.capacity || 10;
    const currentBookings = shiftEntry?.currentBookings || 0;
    return { capacity, currentBookings, remaining: capacity - currentBookings };
  };

  const isShiftFullyBooked = (location: string, date: string, shift: string) => {
    const { remaining } = getShiftCapacity(location, date, shift);
    return remaining <= 0;
  };

  const isShiftSelected = (location: string, date: string, shift: string) => {
    return selectedShifts.some(
      s => s.location === location && s.date === date && s.shift === shift
    );
  };

  const handleShiftClick = (location: string, date: string, shift: string) => {
    // Prevent clicking on fully booked shifts
    if (isShiftFullyBooked(location, date, shift)) {
      toast({
        title: "Fully Booked",
        description: "This shift has reached maximum capacity",
        variant: "destructive",
      });
      return;
    }

    const rate = getShiftRate(location, date, shift);
    const shiftKey = `${location}-${date}-${shift}`;
    
    // Check if this date already has a selection
    const existingShiftForDate = Object.values(shiftSelections).find(s => s.date === date);
    
    if (existingShiftForDate && (existingShiftForDate.location !== location || existingShiftForDate.shift !== shift)) {
      // Remove previous selection for this date
      const prevKey = `${existingShiftForDate.location}-${existingShiftForDate.date}-${existingShiftForDate.shift}`;
      const newSelections = { ...shiftSelections };
      delete newSelections[prevKey];
      setShiftSelections(newSelections);
      
      setSelectedShifts(prev => prev.filter(s => 
        !(s.date === date && s.location === existingShiftForDate.location && s.shift === existingShiftForDate.shift)
      ));
    }

    // Toggle current selection
    if (isShiftSelected(location, date, shift)) {
      // Deselect
      const newSelections = { ...shiftSelections };
      delete newSelections[shiftKey];
      setShiftSelections(newSelections);
      
      setSelectedShifts(prev => prev.filter(s => 
        !(s.location === location && s.date === date && s.shift === shift)
      ));
    } else {
      // Select
      const newShift: ShiftSelection = { location, date, shift: shift as 'DS' | 'SS', rate };
      setShiftSelections(prev => ({ ...prev, [shiftKey]: newShift }));
      setSelectedShifts(prev => [...prev, newShift]);
    }
  };

  const removeShift = (location: string, date: string, shift: string) => {
    const shiftKey = `${location}-${date}-${shift}`;
    const newSelections = { ...shiftSelections };
    delete newSelections[shiftKey];
    setShiftSelections(newSelections);
    
    setSelectedShifts(prev => prev.filter(s => 
      !(s.location === location && s.date === date && s.shift === shift)
    ));
  };

  const handleContinue = () => {
    if (selectedShifts.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one shift before proceeding.",
        variant: "destructive",
      });
      return;
    }
    onShiftsSelected(selectedShifts);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading shift data...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-slate-800">Available Shifts & Rates</h2>
          <p className="text-slate-600 mt-1">Select up to 1 shift per day. Rates shown in NTD (New Taiwan Dollar).</p>
        </div>
        
        <div className="text-sm text-slate-500 mb-6">
          <span className="font-medium">MS</span> = Morning Shift, <span className="font-medium">ES</span> = Evening Shift
        </div>
      </div>

      {/* Pricing Matrix Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border border-slate-200 rounded-lg overflow-hidden table-fixed">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-32 px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                Location
              </th>
              {dates.map(date => (
                <th key={date} className="w-40 px-4 py-3 text-center text-sm font-semibold text-slate-700 border-b border-l border-slate-200" colSpan={2}>
                  {date}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <th className="w-32 px-4 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200"></th>
              {dates.map(date => (
                <React.Fragment key={date}>
                  <th className="w-20 px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                    MS
                  </th>
                  <th className="w-20 px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                    ES
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {locations.map((location, locationIndex) => (
              <tr key={location} className={`h-16 ${locationIndex < locations.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <td className="w-32 h-16 px-4 py-3 border-r border-slate-200">
                  <div className="flex items-center h-full">
                    <MapPin className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="font-medium text-slate-700">{location}</span>
                  </div>
                </td>
                {dates.map(date => (
                  <React.Fragment key={`${location}-${date}`}>
                    {shifts.map(shift => {
                      const rate = getShiftRate(location, date, shift);
                      const selected = isShiftSelected(location, date, shift);
                      const { remaining } = getShiftCapacity(location, date, shift);
                      const fullyBooked = isShiftFullyBooked(location, date, shift);
                      
                      return (
                        <td key={`${location}-${date}-${shift}`} className={`w-20 h-16 px-2 py-2 text-center border-l border-slate-200 ${
                          selected ? 'bg-blue-50' : fullyBooked ? 'bg-gray-100' : ''
                        }`}>
                          <button
                            onClick={() => handleShiftClick(location, date, shift)}
                            disabled={fullyBooked}
                            className={`w-full h-12 flex flex-col items-center justify-center text-xs rounded-md transition-colors ${
                              fullyBooked 
                                ? 'text-gray-400 cursor-not-allowed bg-gray-50 border border-gray-200' 
                                : selected 
                                  ? 'bg-blue-600 text-white border-2 border-blue-700' 
                                  : 'hover:bg-slate-50 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {fullyBooked ? (
                              <>
                                <span className="font-medium">Fully</span>
                                <span className="font-medium">Booked</span>
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-sm">NT${rate}</span>
                                <span className="text-xs opacity-75">{remaining} left</span>
                                {selected && <span className="text-xs font-medium">Selected</span>}
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Earnings Summary */}
      {selectedShifts.length > 0 && (
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-blue-900">Total Earnings Potential</h3>
                <p className="text-blue-700 text-sm">Based on your selected shifts</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-900">
                  NT${selectedShifts.reduce((total, shift) => {
                    const rate = parseInt(shift.rate.replace(/[^\d]/g, ''));
                    return total + rate;
                  }, 0).toLocaleString()}
                </div>
                <p className="text-blue-700 text-sm">{selectedShifts.length} shift{selectedShifts.length > 1 ? 's' : ''} selected</p>
              </div>
            </div>
            
            <div className="mt-4 space-y-2">
              {selectedShifts.map((shift, index) => (
                <div key={index} className="flex justify-between text-sm text-blue-800">
                  <span>{shift.location} - {shift.date} ({shift.shift})</span>
                  <span>NT${parseInt(shift.rate.replace(/[^\d]/g, '')).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← Back to ID Verification
        </Button>
        <Button onClick={handleContinue}>
          Continue to Contact Info →
        </Button>
      </div>
    </div>
  );
}
