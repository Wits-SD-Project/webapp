import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function useReportsData() {
  const [reportData, setReportData] = useState({
    summary: null,
    hourlyData: [],
    facilityData: [],
    dailyData: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const functions = getFunctions();
        const getReportData = httpsCallable(functions, 'getWeeklySummary');
        const result = await getReportData();
        
        setReportData({
          summary: {
            totalBookings: result.data.totalBookings,
            peakHour: result.data.hourlyData.reduce(
              (max, item) => item.bookings > max.bookings ? item : max, 
              result.data.hourlyData[0]
            ).hour,
            mostUsedFacility: result.data.facilityData[0].name
          },
          hourlyData: result.data.hourlyData,
          facilityData: result.data.facilityData,
          dailyData: result.data.dailyData,
          loading: false
        });
      } catch (error) {
        setReportData(prev => ({
          ...prev,
          error: error.message,
          loading: false
        }));
      }
    };

    fetchData();
  }, []);

  return reportData;
}