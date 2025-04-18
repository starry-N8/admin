import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useNavigate } from 'react-router-dom';

/**
 * Converts a time string stored in AM/PM format (e.g. "2:30 PM")
 * to the 24-hour format (e.g. "14:30") required for <input type="time">
 */
function convertTo24HourFormat(timeStr) {
  if (!timeStr) return "";
  const [time, modifier] = timeStr.split(" ");
  if (!modifier) return timeStr;
  let [hours, minutes] = time.split(":");
  hours = parseInt(hours, 10);
  if (modifier.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")} :${minutes}`.replace(' ', '');
}

const Report = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [formData, setFormData] = useState({
    childName: '',
    email: '',
    inTime: '',
    outTime: '',
    snack: '',
    meal: '',
    sleepFrom: '',
    sleepTo: '',
    sleepNot: false,
    diaperChanges: '',
    poops: '',
    feelings: [],
    notes: '',
    themeOfTheDay: [],
    ouch: false,
    ouchReport: '',
    commonParentsNote: ''
  });
  const [availableThemes, setAvailableThemes] = useState([]);

  const feelingsOptions = [
    { label: 'Happy', emoji: '😊' },
    { label: 'Sad', emoji: '😢' },
    { label: 'Restless', emoji: '😕' },
    { label: 'Quiet', emoji: '😌' },
    { label: 'Playful', emoji: '😜' },
    { label: 'Sick', emoji: '🤒' }
  ];
  const radioOptions = [0, 1, 2, 3, 4];

  // Fetch available themes
  useEffect(() => {
    const fetchThemes = async () => {
      try {
        const themeDocRef = doc(db, 'appConfig', 'themeOfTheWeek');
        const snapshot = await getDoc(themeDocRef);
        if (snapshot.exists()) {
          const data = snapshot.data();
          let themes = [];
          if (Array.isArray(data.theme)) {
            themes = data.theme;
          } else if (typeof data.theme === 'string' && data.theme.trim()) {
            themes = data.theme.split(',').map(tag => tag.trim());
          }
          setAvailableThemes(themes);
        }
      } catch (error) {
        console.error('Error fetching themes:', error);
      }
    };
    fetchThemes();
  }, []);

  // Fetch reports for selected date
  useEffect(() => {
    const fetchReports = async () => {
      const dateObj = new Date(selectedDate);
      const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
      const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + 1);
      try {
        const reportsQuery = query(
          collection(db, 'dailyReports'),
          where('date', '>=', startOfDay),
          where('date', '<', endOfDay)
        );
        const snapshot = await getDocs(reportsQuery);
        const fetched = [];
        snapshot.forEach(docSnap => fetched.push({ id: docSnap.id, ...docSnap.data() }));
        setReports(fetched);
      } catch (error) {
        console.error('Error fetching reports:', error);
      }
    };
    fetchReports();
  }, [selectedDate]);

  // Load selected report into form
  const handleReportSelect = report => {
    setSelectedReport(report);
    setFormData({
      childName: report.childName || '',
      email: report.email || '',
      inTime: convertTo24HourFormat(report.inTime),
      outTime: convertTo24HourFormat(report.outTime),
      snack: report.snack || '',
      meal: report.meal || '',
      sleepFrom: convertTo24HourFormat(report.sleepFrom),
      sleepTo: convertTo24HourFormat(report.sleepTo),
      sleepNot: report.sleepNot || false,
      diaperChanges: report.diaperChanges || '',
      poops: report.poops || '',
      feelings: Array.isArray(report.feelings)
        ? report.feelings
        : typeof report.feelings === 'string'
          ? report.feelings.split(',').map(f => f.trim())
          : [],
      notes: report.notes || '',
      themeOfTheDay: Array.isArray(report.themeOfTheDay)
        ? report.themeOfTheDay
        : typeof report.themeOfTheDay === 'string'
          ? report.themeOfTheDay.split(',').map(t => t.trim())
          : [],
      ouch: report.ouch || false,
      ouchReport: report.ouchReport || '',
      commonParentsNote: report.commonParentsNote || ''
    });
  };

  // Handle form field changes
  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'sleepNot') {
      setFormData(prev => ({ ...prev, sleepNot: checked, sleepFrom: '', sleepTo: '' }));
    } else if (type === 'checkbox' && name === 'feelings') {
      setFormData(prev => prev.feelings.includes(value)
        ? { ...prev, feelings: prev.feelings.filter(f => f !== value) }
        : { ...prev, feelings: [...prev.feelings, value] }
      );
    } else if (type === 'checkbox' && name === 'themeOfTheDay') {
      setFormData(prev => prev.themeOfTheDay.includes(value)
        ? { ...prev, themeOfTheDay: prev.themeOfTheDay.filter(t => t !== value) }
        : { ...prev, themeOfTheDay: [...prev.themeOfTheDay, value] }
      );
    } else if (type === 'checkbox' && name === 'ouch') {
      setFormData(prev => ({ ...prev, ouch: checked, ouchReport: checked ? prev.ouchReport : '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle radio changes
  const handleRadioChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Update report in Firestore
  const handleUpdate = async e => {
    e.preventDefault();
    try {
      const reportRef = doc(db, 'dailyReports', selectedReport.id);
      await updateDoc(reportRef, {
        inTime: formData.inTime,
        outTime: formData.outTime,
        snack: formData.snack,
        meal: formData.meal,
        sleepFrom: formData.sleepFrom,
        sleepTo: formData.sleepTo,
        sleepNot: formData.sleepNot,
        diaperChanges: formData.diaperChanges,
        poops: formData.poops,
        feelings: formData.feelings,
        notes: formData.notes,
        themeOfTheDay: formData.themeOfTheDay,
        ouch: formData.ouch,
        ouchReport: formData.ouchReport,
        commonParentsNote: formData.commonParentsNote
      });
      alert('Report updated successfully!');
      setSelectedReport(null);
      setSelectedDate(selectedDate); // trigger refresh
    } catch (error) {
      console.error('Error updating report:', error);
      alert('Failed to update report.');
    }
  };

  // Styles
  const styles = {
    container: { padding: '20px', fontFamily: 'Inter, Arial, sans-serif', background: 'linear-gradient(135deg, #ffecd2, #fcb69f)', minHeight: '100vh' },
    header: { textAlign: 'center', marginBottom: '20px', color: '#A62C2C' },
    datePickerContainer: { textAlign: 'center', marginBottom: '20px' },
    datePicker: { padding: '8px', borderRadius: '6px', border: '1px solid #ccc' },
    gridContainer: { display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' },
    reportBox: { width: '150px', height: '150px', backgroundColor: '#fffbee', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', cursor: 'pointer', textAlign: 'center' },
    formContainer: { backgroundColor: '#fffbee', padding: '30px', borderRadius: '15px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', maxWidth: '700px', margin: '0 auto' },
    label: { fontWeight: '600', marginBottom: '5px', display: 'block' },
    input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #ffc107', fontSize: '15px', outline: 'none' },
    radioGroup: { display: 'flex', gap: '10px', marginBottom: '15px' },
    inlineContainer: { display: 'flex', gap: '40px', marginBottom: '15px' },
    button: { width: '100%', background: '#fcb69f', color: '#4e342e', fontWeight: '600', fontSize: '16px', padding: '15px', border: 'none', borderRadius: '30px', cursor: 'pointer', marginBottom: '10px' },
    backButton: { backgroundColor: '#A62C2C', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'block', margin: '20px auto 0' }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Daily Reports</h1>
      {!selectedReport ? (
        <>
          <div style={styles.datePickerContainer}>
            <label htmlFor="report-date" style={{ fontWeight: 'bold', marginRight: '10px' }}>
              Select Date:
            </label>
            <input
              type="date"
              id="report-date"
              style={styles.datePicker}
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
          {reports.length === 0 ? (
            <p style={{ textAlign: 'center' }}>No reports found for the selected date.</p>
          ) : (
            <div style={styles.gridContainer}>
              {reports.map((report, index) => {
                const colors = [ '#A0C4FF', '#FFD6A5', '#FFC6FF', '#FDFFB6', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'];
                const bgColor = colors[index % colors.length];
                return (
                  <div
                    key={report.id}
                    style={{ ...styles.reportBox, backgroundColor: bgColor }}
                    onClick={() => handleReportSelect(report)}
                  >
                    <strong>{report.childName}</strong>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button style={styles.backButton} onClick={() => navigate('/')}>Back to Home</button>
          </div>
        </>
      ) : (
        <form style={styles.formContainer} onSubmit={handleUpdate}>
          <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#4e342e' }}>Update Daily Report</h2>
          <label style={styles.label}>Child's Name</label>
          <input
            type="text"
            name="childName"
            style={{ ...styles.input, backgroundColor: '#e9ecef' }}
            value={formData.childName}
            readOnly
          />
          {formData.email && (
            <>
              <label style={styles.label}>Email</label>
              <input type="text" name="email" style={{ ...styles.input, backgroundColor: '#e9ecef' }} value={formData.email} readOnly />
            </>
          )}
          <label style={styles.label}>In and Out Time</label>
          <div style={styles.inlineContainer}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>In</label>
              <input type="time" name="inTime" style={styles.input} required value={formData.inTime} onChange={handleChange} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>Out</label>
              <input type="time" name="outTime" style={styles.input} required value={formData.outTime} onChange={handleChange} />
            </div>
          </div>
          <label style={styles.label}>Child ate Snacks</label>
          <div style={styles.radioGroup}>
            {['All', 'Some', 'None'].map(option => (
              <label key={option} style={{ fontWeight: '500', fontSize: '14px' }}>                  <input type="radio" name="snack" value={option} onChange={handleRadioChange} checked={formData.snack === option} required />{option}
              </label>
            ))}
          </div>
          <label style={styles.label}>Child ate Meals</label>
          <div style={styles.radioGroup}>
            {['All', 'Some', 'None'].map(option => (
              <label key={option} style={{ fontWeight: '500', fontSize: '14px' }}><input type="radio" name="meal" value={option} onChange={handleRadioChange} checked={formData.meal === option} required />{option}
              </label>
            ))}
          </div>
          <label style={styles.label}>Child Slept</label>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontWeight: '500', fontSize: '14px' }}><input type="checkbox" name="sleepNot" checked={formData.sleepNot} onChange={handleChange} />Child did not sleep in school</label>
          </div>
          <div style={styles.inlineContainer}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>From</label>
              <input type="time" name="sleepFrom" style={styles.input} value={formData.sleepFrom} onChange={handleChange} disabled={formData.sleepNot} required={!formData.sleepNot} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>To</label>
              <input type="time" name="sleepTo" style={styles.input} value={formData.sleepTo} onChange={handleChange} disabled={formData.sleepNot} required={!formData.sleepNot} />
            </div>
          </div>
          <label style={styles.label}>Diaper Changes</label>
          <div style={styles.radioGroup}>
            {radioOptions.map(opt => (
              <label key={opt} style={{ marginRight: '10px', fontWeight: '500' }}>
                <input type="radio" name="diaperChanges" value={String(opt)} onChange={handleRadioChange} checked={formData.diaperChanges === String(opt)} required />{opt}
              </label>
            ))}
          </div>
          <label style={styles.label}>No. of Poops</label>
          <div style={styles.radioGroup}>
            {radioOptions.map(opt => (
              <label key={opt} style={{ marginRight: '10px', fontWeight: '500' }}><input type="radio" name="poops" value={String(opt)} onChange={handleRadioChange} checked={formData.poops === String(opt)} required />{opt}
              </label>
            ))}
          </div>
          <label style={styles.label}>Child was Feeling</label>
          <div style={{ marginBottom: '20px' }}>
            {feelingsOptions.map(option => (
              <label key={option.label} style={{ fontWeight: '500', fontSize: '14px', marginRight: '20px' }}><input type="checkbox" name="feelings" value={option.label} onChange={handleChange} checked={formData.feelings.includes(option.label)} />{option.label} {option.emoji}
              </label>
            ))}
          </div>
          <label style={styles.label}>Theme of the Day</label>
          <div style={{ marginBottom: '20px' }}>
            {availableThemes.length > 0 ? availableThemes.map(option => (
              <label key={option} style={{ fontWeight: '500', fontSize: '14px', marginRight: '10px' }}><input type="checkbox" name="themeOfTheDay" value={option} onChange={handleChange} checked={formData.themeOfTheDay.includes(option)} />{option}
              </label>
            )) : <p>No themes available</p>}
          </div>
          <label style={styles.label}>Teacher's Note</label>
          <textarea name="notes" rows="3" style={styles.input} value={formData.notes} onChange={handleChange}></textarea>

          {/* Ouch Report */}
          <div style={{ marginBottom: '15px' }}>
            <label style={styles.label}>
              <input type="checkbox" name="ouch" checked={formData.ouch} onChange={handleChange} style={{ marginRight: '10px' }} />Ouch Report
            </label>
            {formData.ouch && (
              <textarea name="ouchReport" rows="3" style={styles.input} value={formData.ouchReport} onChange={handleChange} placeholder="Describe the ouch report..." />
            )}
          </div>

          {/* Common Parents Note */}
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>Common Note for Parents</label>
            <textarea name="commonParentsNote" rows="3" style={styles.input} value={formData.commonParentsNote} onChange={handleChange} placeholder="Common note for parents" />
          </div>

          <button type="submit" style={styles.button}>Update Report</button>
          <button type="button" style={styles.backButton} onClick={() => setSelectedReport(null)}>Back to Reports List</button>
        </form>
      )}
    </div>
  );
};

export default Report;
