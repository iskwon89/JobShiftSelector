import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, X, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language";
import { format } from "date-fns";

import type { ShiftSelection, ShiftData } from "@shared/schema";

// Convert "13-Jun" format or "Mon, Jun 16" format to Date object
const backendFormatToDate = (dateStr: string): Date | null => {
  try {
    const currentYear = new Date().getFullYear();
    
    // Handle "13-Jun" format
    if (dateStr.includes('-')) {
      const [day, monthAbbr] = dateStr.split('-');
      const monthMap: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
      };
      
      const monthIndex = monthMap[monthAbbr];
      if (monthIndex === undefined) return null;
      
      return new Date(currentYear, monthIndex, parseInt(day));
    }
    
    // Handle "Mon, Jun 16" format - extract day and month
    if (dateStr.includes(', ')) {
      const parts = dateStr.split(', ');
      if (parts.length === 2) {
        const [, monthDay] = parts;
        const monthDayParts = monthDay.split(' ');
        if (monthDayParts.length === 2) {
          const [month, day] = monthDayParts;
          
          const monthMap: { [key: string]: number } = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
          };
          
          const monthIndex = monthMap[month];
          if (monthIndex !== undefined) {
            return new Date(currentYear, monthIndex, parseInt(day));
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Format date to "Mon, Jun 16" format
const formatDateDisplay = (dateStr: string) => {
  const date = backendFormatToDate(dateStr);
  if (!date) return dateStr;
  
  return format(date, "EEE, MMM d");
};

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
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number>(0);
  const { toast } = useToast();
  const { t } = useLanguage();

  const { data: shiftData, isLoading } = useQuery<ShiftData[]>({
    queryKey: ['/api/shift-data', userData.cohort],
    queryFn: async () => {
      const response = await fetch(`/api/shift-data/${userData.cohort}`);
      if (!response.ok) throw new Error('Failed to fetch shift data');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds to get updated pricing
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    staleTime: 10000 // Consider data stale after 10 seconds
  });

  // Extract unique locations and dates from the fetched shift data
  const locations = shiftData ? Array.from(new Set(shiftData.map(s => s.location))).sort() : [];
  const dates = shiftData ? Array.from(new Set(shiftData.map(s => s.date))).sort((a, b) => {
    const dateA = backendFormatToDate(a);
    const dateB = backendFormatToDate(b);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  }) : [];
  const shifts = ['DS', 'NS'];

  const getShiftRate = (location: string, date: string, shift: string) => {
    if (!shiftData) return '1x';
    const shiftEntry = shiftData.find(
      s => s.location === location && s.date === date && s.shift === shift
    );
    return shiftEntry?.rate || '1x';
  };

  // Get numeric value from rate string for comparison
  const getRateNumericValue = (rate: string) => {
    const match = rate.match(/^(\d+(?:\.\d+)?)x?$/);
    return match ? parseFloat(match[1]) : 1;
  };

  // Get all rate values to determine min/max for color scaling
  const allRates = shiftData ? shiftData.map(s => getRateNumericValue(s.rate)) : [1];
  const minRate = Math.min(...allRates);
  const maxRate = Math.max(...allRates);

  // Get color intensity based on rate value
  const getRateColorIntensity = (rate: string) => {
    const numericRate = getRateNumericValue(rate);
    if (maxRate === minRate) return 0.5; // Default intensity if all rates are the same
    
    // Scale from 0.2 (low rates) to 1.0 (high rates)
    const intensity = 0.2 + (0.8 * (numericRate - minRate) / (maxRate - minRate));
    return intensity;
  };

  // Get rate text color classes based on intensity
  const getRateTextColor = (rate: string, isSelected: boolean, isFullyBooked: boolean) => {
    if (isFullyBooked) return 'text-gray-400';
    if (isSelected) return 'text-white';
    
    // All unselected rates should be green
    return 'text-green-600 font-bold';
  };

  // Monitor for pricing matrix changes and clear selections when dates are modified
  useEffect(() => {
    if (shiftData) {
      const currentTimestamp = Date.now();
      const currentDates = Array.from(new Set(shiftData.map(s => s.date))).sort();
      
      // If this is not the initial load and dates have changed, clear selections
      if (lastDataTimestamp > 0) {
        const hasDateChanges = JSON.stringify(currentDates) !== JSON.stringify(dates);
        if (hasDateChanges) {
          setSelectedShifts([]);
          setShiftSelections({});
          toast({
            title: "Pricing Matrix Updated",
            description: "The schedule has been updated. Please reselect your shifts.",
            duration: 5000,
          });
        }
      }
      
      setLastDataTimestamp(currentTimestamp);
    }
  }, [shiftData, toast]);

  // Initialize shift selections from initial data with current pricing, filtering out removed dates
  useEffect(() => {
    if (initialSelectedShifts.length > 0 && shiftData) {
      const initialSelections: Record<string, ShiftSelection> = {};
      const updatedShifts: ShiftSelection[] = [];
      const availableDates = Array.from(new Set(shiftData.map(s => s.date)));
      
      initialSelectedShifts.forEach(shift => {
        // Only include shifts for dates that still exist in the current shift data
        if (availableDates.includes(shift.date)) {
          // Check if this specific shift combination still exists
          const shiftExists = shiftData.some(s => 
            s.location === shift.location && 
            s.date === shift.date && 
            s.shift === shift.shift
          );
          
          if (shiftExists) {
            const key = `${shift.location}-${shift.date}-${shift.shift}`;
            // Get current rate from shift data matrix
            const currentRate = getShiftRate(shift.location, shift.date, shift.shift);
            const updatedShift = { ...shift, rate: currentRate };
            
            initialSelections[key] = updatedShift;
            updatedShifts.push(updatedShift);
          }
        }
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
        title: t('shift.full'),
        description: t('error.shiftFull'),
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
      const newShift: ShiftSelection = { location, date, shift: shift as 'DS' | 'NS', rate };
      setShiftSelections(prev => ({ ...prev, [shiftKey]: newShift }));
      setSelectedShifts(prev => [...prev, newShift]);
      
      // Show success toast
      toast({
        title: t('common.success'),
        description: t('shift.selectedSuccess'),
        duration: 1000,
      });
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
        title: t('common.error'),
        description: t('shift.noShifts'),
        variant: "destructive",
      });
      return;
    }
    onShiftsSelected(selectedShifts);
  };

  if (isLoading) {
    return <div className="text-center py-8">{t('common.loading')}</div>;
  }

  return (
    <div className="relative">
      <div className="mb-6 sm:mb-8">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-semibold text-slate-800">{t('shift.title')}</h2>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">{t('shift.subtitle')}</p>
        </div>
        
        <div className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">
          <span className="font-medium">DS</span> = {t('shift.dayShift')}, <span className="font-medium">NS</span> = {t('shift.nightShift')}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto border border-slate-200 rounded-lg mb-8">
        <table className="w-full bg-white" style={{ minWidth: `${128 + dates.length * 160}px` }}>
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 bg-slate-50 z-20 w-32 px-4 py-3 text-left text-sm font-semibold text-slate-700 border-b border-r border-slate-200">
                {t('shift.location')}
              </th>
              {dates.map(date => (
                <th key={date} className="min-w-[160px] px-4 py-3 text-center text-sm font-semibold text-slate-700 border-b border-l border-slate-200" colSpan={2}>
                  {formatDateDisplay(date)}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <th className="sticky left-0 bg-slate-50 z-20 w-32 px-4 py-2 text-left text-xs font-medium text-slate-600 border-b border-r border-slate-200"></th>
              {dates.flatMap(date => [
                <th key={`${date}-ds`} className="min-w-[80px] px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                  DS
                </th>,
                <th key={`${date}-ns`} className="min-w-[80px] px-3 py-2 text-center text-xs font-medium text-slate-600 border-b border-l border-slate-200">
                  NS
                </th>
              ])}
            </tr>
          </thead>
          <tbody className="bg-white">
            {locations.map((location, locationIndex) => (
              <tr key={location} className={`h-20 ${locationIndex < locations.length - 1 ? 'border-b border-slate-100' : ''}`}>
                <td className="sticky left-0 bg-white z-10 w-32 h-20 px-4 py-4 border-r border-slate-200">
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
                      <td key={`${location}-${date}-${shift}`} className={`min-w-[100px] h-20 px-3 py-3 text-center border-l border-slate-200 ${
                        selected ? 'bg-blue-50' : fullyBooked ? 'bg-gray-100' : ''
                      }`}>
                        <button
                          onClick={() => handleShiftClick(location, date, shift)}
                          disabled={fullyBooked}
                          className={`w-full h-16 flex flex-col items-center justify-center rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${
                            fullyBooked 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200' 
                              : selected 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-2 border-blue-400 shadow-lg' 
                                : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                          }`}
                        >
                          {fullyBooked ? (
                            <div className="text-center">
                              <div className="text-sm font-medium">Fully Booked</div>
                            </div>
                          ) : (
                            <div className="text-center space-y-1">
                              <div className={`font-bold ${selected ? 'text-white' : getRateTextColor(rate, selected, fullyBooked)}`} style={{ fontSize: '14px' }}>
                                NT${rate}
                              </div>
                              <div className={`text-xs ${selected ? 'text-blue-100' : 'text-gray-500'}`}>
                                {remaining} available
                              </div>
                            </div>
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
                  <h4 className="font-medium text-slate-700 mb-3 text-center">{formatDateDisplay(date)}</h4>
                  <div className="grid grid-cols-2 gap-2">
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
                          className={`mobile-shift-button p-2 rounded-xl border-2 transition-all duration-200 transform hover:scale-[1.02] min-h-[90px] flex flex-col justify-center overflow-hidden ${
                            fullyBooked 
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                              : selected 
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-400 shadow-xl' 
                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg'
                          }`}
                        >
                          <div className="text-center space-y-1 w-full">
                            <div className={`text-xs font-medium ${selected ? 'text-blue-100' : 'text-gray-500'}`}>
                              {shift === 'DS' ? t('shift.dayShift') : t('shift.nightShift')}
                            </div>
                            {fullyBooked ? (
                              <div className="text-xs font-semibold break-words">Fully Booked</div>
                            ) : (
                              <>
                                <div className={`mobile-pricing-text text-xs font-bold leading-tight break-all ${selected ? 'text-white' : getRateTextColor(rate, selected, fullyBooked)}`}>
                                  NT${rate}
                                </div>
                                <div className={`text-xs ${selected ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {remaining} available
                                </div>
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
                <h3 className="text-base sm:text-lg font-semibold text-blue-900">{t('summary.totalEarnings')}</h3>
                <p className="text-blue-700 text-xs sm:text-sm">{t('shift.subtitle')}</p>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xl sm:text-2xl font-bold text-blue-900">
                  NT${selectedShifts.reduce((total, shift) => {
                    const rate = parseInt(shift.rate.replace(/[^\d]/g, ''));
                    return total + rate;
                  }, 0).toLocaleString()}
                </div>
                <p className="text-blue-700 text-xs sm:text-sm">{selectedShifts.length} {selectedShifts.length === 1 ? t('summary.shiftSelected') : t('summary.shiftsSelected')}</p>
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
          ← {t('common.back')}
        </Button>
        <Button onClick={handleContinue} className="order-1 sm:order-2">
          {t('common.next')} →
        </Button>
      </div>
    </div>
  );
}
