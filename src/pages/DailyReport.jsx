// src/pages/DailyReport.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const DailyReport = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get query parameters
  const searchParams = new URLSearchParams(location.search);
  const childFromParam = searchParams.get('child') || '';

  // State for kids info and email
  const [kidsInfo, setKidsInfo] = useState([]);
  const [kidEmail, setKidEmail] = useState('');

  // State for available themes fetched from Firebase.
  const [availableThemes, setAvailableThemes] = useState([]);

  // Form state for the daily report.
  // Initialize the 'themes' field as an empty array so no checkboxes are pre-selected.
  const [formData, setFormData] = useState({
    childName: childFromParam,
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
    themes: [],
    email: '',
  });

  // Attendance and report tracking state.
  const [presentChildren, setPresentChildren] = useState({});
  const [reportedChildren, setReportedChildren] = useState([]);

  // Feelings options with emojis.
  const feelingsOptions = [
    { label: 'Happy', emoji: '😊' },
    { label: 'Sad', emoji: '😢' },
    { label: 'Restless', emoji: '😕' },
    { label: 'Quiet', emoji: '😌' },
    { label: 'Playful', emoji: '😜' },
    { label: 'Sick', emoji: '🤒' }
  ];

  // Radio options for Diaper Changes and Poops.
  const radioOptions = [0, 1, 2, 3, 4];

  // Memoize today's start and end of day.
  const { startOfDay, endOfDay } = useMemo(() => {
    const today = new Date();
    return {
      startOfDay: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      endOfDay: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
    };
  }, []);

  // --- Fetch available themes from Firebase ---
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
          } else if (typeof data.theme === 'string' && data.theme.trim().length > 0) {
            themes = data.theme.split(',').map(tag => tag.trim());
          }
          setAvailableThemes(themes);
          
          // If the document has themeOfTheDay, pre-select those checkboxes.
          if (data.themeOfTheDay && Array.isArray(data.themeOfTheDay)) {
            setFormData(prev => ({
              ...prev,
              themes: data.themeOfTheDay
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching themes from Firebase:', error);
      }
    };
    fetchThemes();
  }, []);

  // --- Load kids info from "kidsInfo" collection ---
  useEffect(() => {
    const loadKidsInfo = async () => {
      try {
        const kidsSnapshot = await getDocs(collection(db, 'kidsInfo'));
        const kidsList = kidsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() // expected fields: name, email, etc.
        }));
        setKidsInfo(kidsList);
      } catch (error) {
        console.error('Error fetching kids info:', error);
      }
    };
    loadKidsInfo();
  }, []);

  // --- Fetch today's attendance data (present kids) ---
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('date', '>=', startOfDay),
          where('date', '<', endOfDay)
        );
        const snapshot = await getDocs(attendanceQuery);
        let tempPresent = {};
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (data && data.attendance) {
            Object.entries(data.attendance).forEach(([kidName, record]) => {
              if (record.status === 'present') {
                tempPresent[kidName] = record;
              }
            });
          }
        });
        setPresentChildren(tempPresent);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      }
    };
    fetchAttendance();
  }, [startOfDay, endOfDay]);

  // --- Fetch today's submitted daily reports ---
  useEffect(() => {
    const fetchDailyReports = async () => {
      try {
        const reportsQuery = query(
          collection(db, 'dailyReports'),
          where('date', '>=', startOfDay),
          where('date', '<', endOfDay)
        );
        const snapshot = await getDocs(reportsQuery);
        const reportedNames = snapshot.docs.map(doc => doc.data().childName);
        setReportedChildren(reportedNames);
      } catch (error) {
        console.error('Error fetching daily reports:', error);
      }
    };
    fetchDailyReports();
  }, [startOfDay, endOfDay]);

  // --- Update kidEmail when childName changes ---
  useEffect(() => {
    if (formData.childName && kidsInfo.length > 0) {
      const kid = kidsInfo.find(k => k.name === formData.childName);
      if (kid) {
        setKidEmail(kid.email);
        setFormData(prev => ({ ...prev, email: kid.email }));
      } else {
        setKidEmail('');
        setFormData(prev => ({ ...prev, email: '' }));
      }
    }
  }, [formData.childName, kidsInfo]);

  // --- Auto-populate inTime from attendance ---
  useEffect(() => {
    if (formData.childName && presentChildren[formData.childName]?.time) {
      const time = presentChildren[formData.childName].time;
      setFormData(prev => ({ ...prev, inTime: time }));
    }
  }, [formData.childName, presentChildren]);

  // --- Handler for generic input changes ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox' && name === 'sleepNot') {
      setFormData(prev => ({
        ...prev,
        sleepNot: checked,
        sleepFrom: '',
        sleepTo: ''
      }));
    } else if (type === 'checkbox' && name === 'feelings') {
      if (formData.feelings.includes(value)) {
        setFormData(prev => ({
          ...prev,
          feelings: prev.feelings.filter(f => f !== value)
        }));
      } else {
        setFormData(prev => ({ ...prev, feelings: [...prev.feelings, value] }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // --- Handler for theme checkbox changes ---
  const handleThemeCheckboxChange = (option) => {
    if (formData.themes.includes(option)) {
      setFormData(prev => ({
        ...prev,
        themes: prev.themes.filter(t => t !== option)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        themes: [...prev.themes, option]
      }));
    }
  };

  // --- Handle daily report submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    const reportData = {
      ...formData,
      theme: formData.themes, // Save the final themes array
      date: new Date()
    };
    // Remove unneeded keys from reportData if necessary
    delete reportData.themes;
    try {
      await addDoc(collection(db, 'dailyReports'), reportData);
      alert("Daily report submitted successfully!");
      // Reset form
      setFormData({
        childName: '',
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
        themes: [],
        email: '',
      });
      setKidEmail('');
      navigate('/');
    } catch (error) {
      console.error("Error submitting daily report:", error);
      alert("Error submitting daily report.");
    }
  };

  // --- Kid-friendly Styles ---
  const containerStyle = {
    background: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
    minHeight: '100vh',
    padding: '20px',
    fontFamily: 'Comic Sans MS, cursive, sans-serif',
  };

  const formStyleCSS = {
    background: '#fffbee',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    margin: '0 auto',
  };

  const labelStyleCSS = {
    fontWeight: '600',
    marginBottom: '5px',
    display: 'block',
  };

  const inputStyleCSS = {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    borderRadius: '8px',
    border: '1px solid #ffc107',
    fontSize: '15px',
    outline: 'none',
  };

  const inputStyleCSSText = {
    width: '95%',
    padding: '12px',
    marginBottom: '15px',
    borderRadius: '8px',
    border: '1px solid #ffc107',
    fontSize: '15px',
    outline: 'none',
  };

  const buttonStyle = {
    width: '100%',
    background: '#fcb69f',
    color: '#4e342e',
    fontWeight: '600',
    fontSize: '16px',
    padding: '15px',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
  };

  const sideBySideStyle = {
    display: 'flex',
    marginBottom: '15px',
    marginRight: '25px',
    gap: '35px'
  };

  const columnStyle = { flex: 1, display: 'flex', flexDirection: 'column' };

  // --- Compute available children for dropdown ---
  // Only display children who are present and haven't reported today.
  const availableChildren = Object.keys(presentChildren).filter(
    (kidName) => !reportedChildren.includes(kidName)
  );

  return (
    <div style={containerStyle}>
      <form style={formStyleCSS} onSubmit={handleSubmit}>
        <h2 style={{ textAlign: 'center', marginBottom: '20px', color: '#4e342e' }}>
          Daily Updates
        </h2>

        {/* Child's Name Dropdown */}
        <label style={labelStyleCSS}>Child's Name</label>
        <select
          name="childName"
          style={inputStyleCSS}
          required
          value={formData.childName}
          onChange={handleChange}
        >
          <option value="" disabled>Select Child</option>
          {availableChildren.map((kidName) => (
            <option key={kidName} value={kidName}>
              {kidName}
            </option>
          ))}
        </select>

        {/* Kid's Email (non-editable) */}
        {kidEmail && (
          <>
            <label style={labelStyleCSS}>Email</label>
            <input
              type="text"
              value={kidEmail}
              style={{ ...inputStyleCSSText, backgroundColor: '#e9ecef' }}
              readOnly
            />
          </>
        )}

        {/* In and Out Time Section */}
        <label style={labelStyleCSS}>In and Out Time</label>
        <div style={sideBySideStyle}>
          <div style={columnStyle}>
            <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>
              In
            </label>
            <input
              type="time"
              name="inTime"
              style={inputStyleCSS}
              required
              value={formData.inTime}
              onChange={handleChange}
            />
          </div>
          <div style={columnStyle}>
            <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>
              Out
            </label>
            <input
              type="time"
              name="outTime"
              style={inputStyleCSS}
              required
              value={formData.outTime}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Snack Selection */}
        <label style={labelStyleCSS}>Child at Snack</label>
        <div style={{ marginBottom: '15px' }}>
          {['All', 'Some', 'None'].map(option => (
            <label key={option} style={{ fontWeight: '500', fontSize: '14px', marginRight: '10px' }}>
              <input
                type="radio"
                name="snack"
                value={option}
                onChange={handleChange}
                checked={formData.snack === option}
                required
              />
              {option}
            </label>
          ))}
        </div>

        {/* Meal Selection */}
        <label style={labelStyleCSS}>Child at Meal</label>
        <div style={{ marginBottom: '15px' }}>
          {['All', 'Some', 'None'].map(option => (
            <label key={option} style={{ fontWeight: '500', fontSize: '14px', marginRight: '10px' }}>
              <input
                type="radio"
                name="meal"
                value={option}
                onChange={handleChange}
                checked={formData.meal === option}
                required
              />
              {option}
            </label>
          ))}
        </div>

        {/* Child Slept Section */}
        <label style={labelStyleCSS}>Child Slept</label>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ fontWeight: '500', fontSize: '14px' }}>
            <input
              type="checkbox"
              name="sleepNot"
              checked={formData.sleepNot}
              onChange={handleChange}
            />
            Child did not sleep in school
          </label>
        </div>
        <div style={sideBySideStyle}>
          <div style={columnStyle}>
            <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>
              From
            </label>
            <input
              type="time"
              name="sleepFrom"
              style={inputStyleCSS}
              value={formData.sleepFrom}
              onChange={handleChange}
              disabled={formData.sleepNot}
              required={!formData.sleepNot}
            />
          </div>
          <div style={columnStyle}>
            <label style={{ fontSize: '14px', fontWeight: '500', marginBottom: '5px' }}>
              To
            </label>
            <input
              type="time"
              name="sleepTo"
              style={inputStyleCSS}
              value={formData.sleepTo}
              onChange={handleChange}
              disabled={formData.sleepNot}
              required={!formData.sleepNot}
            />
          </div>
        </div>

        {/* Diaper Changes */}
        <label style={labelStyleCSS}>Diaper Changes</label>
        <div style={{ marginBottom: '15px' }}>
          {radioOptions.map(opt => (
            <label key={opt} style={{ marginRight: '10px', fontWeight: '500' }}>
              <input
                type="radio"
                name="diaperChanges"
                value={String(opt)}
                onChange={handleChange}
                checked={formData.diaperChanges === String(opt)}
                required
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Number of Poops */}
        <label style={labelStyleCSS}>No. of Poops</label>
        <div style={{ marginBottom: '15px' }}>
          {radioOptions.map(opt => (
            <label key={opt} style={{ marginRight: '10px', fontWeight: '500' }}>
              <input
                type="radio"
                name="poops"
                value={String(opt)}
                onChange={handleChange}
                checked={formData.poops === String(opt)}
                required
              />
              {opt}
            </label>
          ))}
        </div>

        {/* Child was Feeling */}
        <label style={labelStyleCSS}>Child was Feeling</label>
        <div style={{ marginBottom: '15px' }}>
          {feelingsOptions.map(option => (
            <label key={option.label} style={{ fontWeight: '500', fontSize: '14px', marginRight: '10px' }}>
              <input
                type="checkbox"
                name="feelings"
                value={option.label}
                onChange={handleChange}
                checked={formData.feelings.includes(option.label)}
              />
              {option.label} {option.emoji}
            </label>
          ))}
        </div>

        {/* Teacher's Note */}
        <label style={labelStyleCSS}>Teacher's Note</label>
        <textarea
          name="notes"
          rows="3"
          placeholder="Enter any additional notes here..."
          style={inputStyleCSSText}
          value={formData.notes}
          onChange={handleChange}
        ></textarea>

        {/* Theme Selection as checkboxes using availableThemes from Firebase */}
        <label style={labelStyleCSS}>Theme of the Week</label>
        <div style={{ marginBottom: '15px' }}>
          {availableThemes.length > 0 ? (
            availableThemes.map(option => (
              <label key={option} style={{ fontWeight: '500', fontSize: '14px', marginRight: '10px' }}>
                <input
                  type="checkbox"
                  name="themes"
                  value={option}
                  checked={formData.themes.includes(option)}
                  onChange={() => handleThemeCheckboxChange(option)}
                />
                {option}
              </label>
            ))
          ) : (
            <p>No themes available</p>
          )}
        </div>

        <button type="submit" style={buttonStyle}>Update</button>
      </form>
    </div>
  );
};

export default DailyReport;
