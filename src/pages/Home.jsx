// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

const StarIcon = () => (
  <span style={{ color: '#FFD700', marginRight: '6px' }}>★</span>
);

const Home = () => {
  const navigate = useNavigate();

  // State for theme of the week (all available tags) and for theme of the day.
  const [themeTags, setThemeTags] = useState([]);
  const [dayThemes, setDayThemes] = useState([]);
  const [kids, setKids] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [dailyReportsMapping, setDailyReportsMapping] = useState({});
  const [docId, setDocId] = useState(null);

  const markedCount = Object.keys(attendanceData).length;

  const styles = {
    container: {
      padding: '20px',
      fontFamily: 'Comic Sans MS, cursive, sans-serif',
      background: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
      minHeight: '100vh',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    dateText: {
      fontSize: '16px',
      color: '#555',
    },
    attendanceSummary: {
      backgroundColor: '#444',
      color: '#fff',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
    },
    progressBarOuter: {
      width: '100%',
      height: '15px',
      backgroundColor: '#eee',
      borderRadius: '8px',
      marginTop: '15px',
    },
    progressBarInner: {
      height: '15px',
      backgroundColor: '#ffd60a',
      borderRadius: '8px',
      transition: 'width 0.4s ease',
    },
    themeLine: {
      marginTop: '10px',
      fontStyle: 'italic',
    },
    dailyUpdatesBox: {
      backgroundColor: '#fffbee',
      padding: '20px',
      borderRadius: '10px',
      textAlign: 'center',
      fontSize: '20px',
      fontWeight: 'bold',
      color: '#d62828',
      marginBottom: '20px',
      cursor: 'pointer',
    },
    manageButton: {
      padding: '10px 16px',
      borderRadius: '6px',
      border: 'none',
      backgroundColor: '#0077b6',
      color: '#fff',
      fontWeight: 'bold',
      cursor: 'pointer',
      textAlign: 'center',
      display: 'block',
      margin: '0 auto 20px auto'
    },
    attendanceSection: {
      backgroundColor: '#ffffff',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
    },
    kidRow: {
      padding: '10px 5px',
      borderBottom: '1px solid #eee',
    },
    rowTop: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    kidName: {
      fontSize: '16px',
      cursor: 'pointer',
      fontWeight: 'bold',
      color: '#555',
    },
    tickIcon: {
      color: 'green',
      marginLeft: '8px',
      fontSize: '18px',
    },
    buttonGroup: {
      display: 'flex',
      gap: '8px',
    },
    button: {
      padding: '6px 10px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      transition: 'background 0.3s',
      fontSize: '14px',
    },
    presentButton: {
      backgroundColor: '#90be6d',
      color: '#fff',
    },
    absentButton: {
      backgroundColor: '#f94144',
      color: '#fff',
    },
    disabledButton: {
      opacity: 0.6,
      cursor: 'default',
    }
  };

  // Load kids from Firestore.
  const loadKidsInfo = async () => {
    try {
      const kidsSnapshot = await getDocs(collection(db, 'kidsInfo'));
      const kidsList = kidsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setKids(kidsList);
    } catch (error) {
      console.error('Error fetching kids info:', error);
    }
  };

  // Load both theme (week) and themeOfTheDay from Firebase.
  const loadThemesFromFirebase = async () => {
    try {
      const themeDocRef = doc(db, 'appConfig', 'themeOfTheWeek');
      const snapshot = await getDoc(themeDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.theme) {
          if (Array.isArray(data.theme)) {
            setThemeTags(data.theme);
          } else if (typeof data.theme === 'string') {
            setThemeTags(data.theme.split(',').map(tag => tag.trim()));
          }
        }
        if (data.themeOfTheDay) {
          setDayThemes(data.themeOfTheDay);
        }
      }
    } catch (error) {
      console.error('Error loading themes from Firebase:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('date', '>=', startOfDay),
        where('date', '<', endOfDay)
      );
      const snapshot = await getDocs(attendanceQuery);
      let tempAttendance = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.attendance) {
          tempAttendance = { ...tempAttendance, ...data.attendance };
        }
        setDocId(docSnap.id);
      });
      setAttendanceData(tempAttendance);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchDailyReports = async () => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const reportsQuery = query(
        collection(db, 'dailyReports'),
        where('date', '>=', startOfDay),
        where('date', '<', endOfDay)
      );
      const snapshot = await getDocs(reportsQuery);
      let reportsMapping = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.childName) {
          reportsMapping[data.childName] = data;
        }
      });
      setDailyReportsMapping(reportsMapping);
    } catch (error) {
      console.error('Error fetching daily reports:', error);
    }
  };

  const handleKidClick = (kidName) => {
    const attendance = attendanceData[kidName];
    if (!attendance || attendance.status !== 'present') {
      alert(`Daily report can only be submitted if ${kidName} is marked Present.`);
      return;
    }
    if (dailyReportsMapping[kidName]) {
      alert(`Daily report for ${kidName} has already been submitted.`);
    } else {
      // Pass themeOfTheDay as a query parameter.
      navigate(`/daily-report?child=${encodeURIComponent(kidName)}&themeOfTheDay=${encodeURIComponent(dayThemes.join(', '))}`);
    }
  };

  const markAttendance = async (kidName, status) => {
    if (attendanceData[kidName]) return;
    const now = new Date();
    const dateString = now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const timeHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const updatedRecord = { status, time: timeHHMM, markedAt: dateString };
    setAttendanceData((prev) => ({ ...prev, [kidName]: updatedRecord }));
    try {
      if (docId) {
        const attendanceRef = doc(db, 'attendance', docId);
        await updateDoc(attendanceRef, {
          [`attendance.${kidName}`]: updatedRecord,
          date: new Date(),
        });
      } else {
        const newDoc = await addDoc(collection(db, 'attendance'), {
          date: new Date(),
          attendance: { [kidName]: updatedRecord },
        });
        setDocId(newDoc.id);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance.');
    }
  };

  const todayDateString = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const progressPercentage = kids.length > 0 ? (markedCount / kids.length) * 100 : 0;

  useEffect(() => {
    loadKidsInfo();
    loadThemesFromFirebase();
    fetchAttendance();
    fetchDailyReports();
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h2 style={{ margin: 0, color: '#d62828' }}>Wednesday</h2>
        <span style={styles.dateText}>{todayDateString}</span>
      </header>

      <div style={styles.attendanceSummary}>
        <h3 style={{ margin: 0 }}>Today Attendance</h3>
        <p style={{ margin: '5px 0 0' }}>
          {markedCount}/{kids.length} Done
        </p>
        <div style={styles.progressBarOuter}>
          <div style={{ ...styles.progressBarInner, width: `${progressPercentage}%` }} />
        </div>
        <p style={styles.themeLine}>
          <StarIcon />
          Theme of the week: {themeTags.join(', ')}
        </p>
        <p style={styles.themeLine}>
          <StarIcon />
          Theme of the day: {dayThemes.join(', ')}
        </p>
      </div>

      <div style={styles.dailyUpdatesBox} onClick={() => {
          navigate(`/daily-report?themeOfTheDay=${encodeURIComponent(dayThemes.join(', '))}`);
      }}>
        Go to Daily Updates
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button style={styles.manageButton} onClick={() => navigate('/theme-management')}>
          Manage Theme Tags
        </button>
      </div>

      <div style={styles.attendanceSection}>
        {kids.map((kid) => (
          <div key={kid.id} style={styles.kidRow}>
            <div style={styles.rowTop}>
              <span
                style={{
                  ...styles.kidName,
                  color: attendanceData[kid.name]?.status === 'present' ? '#0077b6' : '#555',
                }}
                onClick={() => handleKidClick(kid.name)}
              >
                {kid.name}
                {dailyReportsMapping[kid.name] && <span style={styles.tickIcon}>✓</span>}
              </span>
              <div style={styles.buttonGroup}>
                <button
                  style={{
                    ...styles.button,
                    ...styles.presentButton,
                    ...(attendanceData[kid.name] ? styles.disabledButton : {}),
                  }}
                  onClick={() => markAttendance(kid.name, 'present')}
                  disabled={!!attendanceData[kid.name]}
                >
                  Present
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...styles.absentButton,
                    ...(attendanceData[kid.name] ? styles.disabledButton : {}),
                  }}
                  onClick={() => markAttendance(kid.name, 'absent')}
                  disabled={!!attendanceData[kid.name]}
                >
                  Absent
                </button>
              </div>
            </div>
            {attendanceData[kid.name] && (
              <div style={{ marginTop: '5px', fontSize: '13px', color: '#444' }}>
                {`${kid.name} marked ${attendanceData[kid.name].status.toUpperCase()} on ${attendanceData[kid.name].markedAt}.`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;
