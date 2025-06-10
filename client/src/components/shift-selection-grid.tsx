import { useState, useEffect } from "react";
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

  const locations = ['FC1', 'FC2', 'FC3', 'FC4', 'FC5'];
  const dates = ['10-Jun', '11-Jun', '12-Jun'];
  const shifts = ['DS', 'SS'];

  const getShiftRate = (location: string, date: string, shift: string) => {
    if (!shiftData) return '1x';
    const shiftEntry = shiftData.find(
      s => s.location === location && s.date === date && s.shift === shift
    );
    return shiftEntry?.rate || '1x';
  };

  const isShiftSelected = (location: string, date: string, shift: string) => {
    return selectedShifts.some(
      s => s.location === location && s.date === date && s.shift === shift
    );
  };

  const handleShiftClick = (location: string, date: string, shift: string) => {
    const rate = getShiftRate(location, date, shift);
    const shiftKey = `${location}-${date}-${shift}`;
    
    // Check if this date already has a selection
    const existingShiftForDate = Object.values(shiftSelections).find(s => s.date === date);
    
    if (existingShiftForDate && existingShiftForDate.location !== location || existingShiftForDate?.shift !== shift) {
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
      const newShift: ShiftSelection = { location, date, shift, rate };
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Available Shifts & Rates</h2>
            <p className="text-slate-600 mt-1">Select up to 1 shift per day. Rates are multipliers of base pay.</p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {userData.name} - Cohort {userData.cohort}
            </Badge>
          </div>
        </div>
        
        <div className="text-sm text-slate-500 mb-6">
          <span className="font-medium">DS</span> = Day Shift, <span className="font-medium">SS</span> = Swing Shift
        </div>
      </div>

      {/* Pricing Matrix Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-slate-200">
                Location
              </th>
              {dates.map(date => (
                <th key={date} className="px-4 py-3 text-center text-sm font-semibold text-slate-700 border-b border-l border-slate-200" colSpan={2}>
                  {date}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600 border-b border-slate-200"></th>
              {dates.map(date => (
                <>
                  <th key={`${date}-DS`} className="px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                    DS
                  </th>
                  <th key={`${date}-SS`} className="px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                    SS
                  </th>
                </>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {locations.map((location, locationIndex) => (
              <tr key={location} className={`${locationIndex < locations.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <td className="px-4 py-3 border-r border-slate-200">
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 text-slate-400 mr-2" />
                    <span className="font-medium text-slate-700">{location}</span>
                  </div>
                </td>
                {dates.map(date => (
                  <>
                    {shifts.map(shift => {
                      const rate = getShiftRate(location, date, shift);
                      const selected = isShiftSelected(location, date, shift);
                      
                      return (
                        <td key={`${date}-${shift}`} className={`px-3 py-3 text-center border-l border-slate-200 ${selected ? 'bg-blue-50' : ''}`}>
                          <button
                            onClick={() => handleShiftClick(location, date, shift)}
                            className={`w-full py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                              selected
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {rate}
                            {selected && <div className="text-xs mt-1">Selected</div>}
                          </button>
                        </td>
                      );
                    })}
                  </>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selected Shifts Summary */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-slate-800 mb-4">Selected Shifts Summary</h3>
          <div className="space-y-2">
            {selectedShifts.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No shifts selected</p>
            ) : (
              selectedShifts.map((shift, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded-md border border-slate-200">
                  <div>
                    <span className="font-medium text-slate-700">
                      {shift.location} - {shift.date} ({shift.shift})
                    </span>
                    <span className="text-sm text-slate-500 ml-2">
                      {shift.shift === 'DS' ? 'Day Shift' : 'Swing Shift'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-blue-600 font-semibold mr-3">{shift.rate} rate</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeShift(shift.location, shift.date, shift.shift)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

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
