import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, X, Info } from "lucide-react";
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
  initialSelectedShifts?: ShiftSelection[];
  isReturningUser?: boolean;
}

export function ShiftSelectionGrid({ userData, onShiftsSelected, onBack, initialSelectedShifts = [], isReturningUser = false }: ShiftSelectionGridProps) {
  const [selectedShifts, setSelectedShifts] = useState<ShiftSelection[]>(initialSelectedShifts);
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

  // Initialize shift selections from initial data with current pricing
  useEffect(() => {
    if (initialSelectedShifts.length > 0 && shiftData) {
      const initialSelections: Record<string, ShiftSelection> = {};
      const updatedShifts: ShiftSelection[] = [];
      
      initialSelectedShifts.forEach(shift => {
        const key = `${shift.location}-${shift.date}-${shift.shift}`;
        // Get current rate from shift data matrix
        const currentRate = getShiftRate(shift.location, shift.date, shift.shift);
        const updatedShift = { ...shift, rate: currentRate };
        
        initialSelections[key] = updatedShift;
        updatedShifts.push(updatedShift);
      });
      
      setShiftSelections(initialSelections);
      setSelectedShifts(updatedShifts);
    }
  }, [initialSelectedShifts, shiftData]);

  const getShiftCapacity = (location: string, date: string, shift: string) => {
    if (!shiftData) return { capacity: 10, currentBookings: 0, remaining: 10 };
    const shiftEntry = shiftData.find(
      s => s.location === location && s.date === date && s.shift === shift
    );
    const capacity = shiftEntry?.capacity ?? 10;
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
      <div className="mb-6 sm:mb-8">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">Available Shifts & Rates</h2>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Select up to 1 shift per day. Rates shown in NTD (New Taiwan Dollar).</p>
        </div>


        
        <div className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">
          <span className="font-medium">MS</span> = Morning Shift, <span className="font-medium">ES</span> = Evening Shift
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto mb-8">
        <table className="w-full border border-slate-200 rounded-lg overflow-hidden table-fixed min-w-[800px]">
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
              {dates.flatMap(date => [
                <th key={`${date}-ms`} className="w-20 px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                  MS
                </th>,
                <th key={`${date}-es`} className="w-20 px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                  ES
                </th>
              ])}
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
                {dates.flatMap(date => 
                  shifts.map(shift => {
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
                  })
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4 mb-8">
        {locations.map(location => (
          <div key={location} className="border border-slate-200 rounded-lg bg-white">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 rounded-t-lg">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 text-slate-400 mr-2" />
                <span className="font-semibold text-slate-700">{location}</span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {dates.map(date => (
                <div key={date} className="border border-slate-200 rounded-lg p-3">
                  <h4 className="font-medium text-slate-700 mb-3 text-center">{date}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {shifts.map(shift => {
                      const rate = getShiftRate(location, date, shift);
                      const selected = isShiftSelected(location, date, shift);
                      const { remaining } = getShiftCapacity(location, date, shift);
                      const fullyBooked = isShiftFullyBooked(location, date, shift);
                      
                      return (
                        <button
                          key={shift}
                          onClick={() => handleShiftClick(location, date, shift)}
                          disabled={fullyBooked}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            fullyBooked 
                              ? 'text-gray-400 cursor-not-allowed bg-gray-50 border-gray-200' 
                              : selected 
                                ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                                : 'hover:bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-xs font-medium text-slate-500 mb-1">
                              {shift === 'DS' ? 'Morning Shift' : 'Evening Shift'}
                            </div>
                            {fullyBooked ? (
                              <div className="text-sm font-medium">Fully Booked</div>
                            ) : (
                              <>
                                <div className="text-lg font-bold">NT${rate}</div>
                                <div className="text-xs opacity-75">{remaining} slots left</div>
                                {selected && (
                                  <div className="text-xs font-medium mt-1 bg-white bg-opacity-20 rounded px-2 py-1">
                                    Selected
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Earnings Summary */}
      {selectedShifts.length > 0 && (
        <Card className="mb-6 sm:mb-8 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-blue-900">Total Earnings Potential</h3>
                <p className="text-blue-700 text-xs sm:text-sm">Based on your selected shifts</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xl sm:text-2xl font-bold text-blue-900">
                  NT${selectedShifts.reduce((total, shift) => {
                    const rate = parseInt(shift.rate.replace(/[^\d]/g, ''));
                    return total + rate;
                  }, 0).toLocaleString()}
                </div>
                <p className="text-blue-700 text-xs sm:text-sm">{selectedShifts.length} shift{selectedShifts.length > 1 ? 's' : ''} selected</p>
              </div>
            </div>
            
            <div className="mt-3 sm:mt-4 space-y-1 sm:space-y-2">
              {selectedShifts.map((shift, index) => (
                <div key={index} className="flex justify-between text-xs sm:text-sm text-blue-800">
                  <span>{shift.location} - {shift.date} ({shift.shift})</span>
                  <span>NT${parseInt(shift.rate.replace(/[^\d]/g, '')).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0">
        <Button variant="ghost" onClick={onBack} className="order-2 sm:order-1">
          ← Back to ID Verification
        </Button>
        <Button onClick={handleContinue} className="order-1 sm:order-2">
          Continue to Contact Info →
        </Button>
      </div>
    </div>
  );
}
