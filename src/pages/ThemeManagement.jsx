// src/pages/ThemeManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const ThemeManagement = () => {
  const navigate = useNavigate();
  // State for themes created (Theme of the Week)
  const [tags, setTags] = useState([]);
  // State for the current theme of the day (selected checkboxes)
  const [dayThemes, setDayThemes] = useState([]);
  const [tagInput, setTagInput] = useState('');

  const styles = {
    container: {
      padding: '20px',
      fontFamily: '"Comic Sans MS", cursive, sans-serif',
      background: 'linear-gradient(135deg, #ffecd2, #fcb69f)',
      minHeight: '100vh',
    },
    header: {
      marginBottom: '20px',
      textAlign: 'center',
    },
    title: {
      fontSize: '28px',
      color: '#d62828',
    },
    section: {
      marginBottom: '40px',
      padding: '10px 20px',
      backgroundColor: '#fffbee',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    sectionTitle: {
      fontSize: '20px',
      color: '#0077b6',
      borderBottom: '1px solid #0077b6',
      paddingBottom: '5px',
      marginBottom: '15px',
    },
    inputRow: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: '15px',
    },
    tagInput: {
      width: '70%',
      padding: '8px',
      borderRadius: '6px',
      border: '1px solid #ccc',
      fontSize: '16px',
      marginRight: '10px',
    },
    addButton: {
      backgroundColor: '#ffba08',
      color: '#333',
      padding: '8px 12px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
    },
    tagContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '5px',
      justifyContent: 'center',
    },
    tag: {
      backgroundColor: '#0077b6',
      color: '#fff',
      padding: '5px 10px',
      borderRadius: '12px',
      fontSize: '14px',
      cursor: 'pointer',
    },
    checkboxList: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    },
    checkboxItem: {
      fontSize: '16px',
      marginBottom: '8px',
      cursor: 'pointer',
    },
    backButton: {
      backgroundColor: '#f94144',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      marginTop: '20px',
      display: 'block',
      marginLeft: 'auto',
      marginRight: 'auto',
    },
  };

  // Load both "theme" and "themeOfTheDay" from Firebase.
  const loadThemesFromFirebase = async () => {
    try {
      const themeDocRef = doc(db, 'appConfig', 'themeOfTheWeek');
      const snapshot = await getDoc(themeDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTags(data.theme || []);
        setDayThemes(data.themeOfTheDay || []);
      }
    } catch (error) {
      console.error('Error loading themes from Firebase:', error);
    }
  };

  // Save the theme of the week list.
  const saveThemeOfTheWeek = async (newTags) => {
    try {
      const themeDocRef = doc(db, 'appConfig', 'themeOfTheWeek');
      await setDoc(themeDocRef, { theme: newTags }, { merge: true });
    } catch (error) {
      console.error('Error saving theme of the week to Firebase:', error);
    }
  };

  // Save the theme of the day.
  const saveThemeOfTheDay = async (newDayThemes) => {
    try {
      const themeDocRef = doc(db, 'appConfig', 'themeOfTheWeek');
      await setDoc(themeDocRef, { themeOfTheDay: newDayThemes }, { merge: true });
    } catch (error) {
      console.error('Error saving theme of the day to Firebase:', error);
    }
  };

  useEffect(() => {
    loadThemesFromFirebase();
  }, []);

  // Add a tag to Theme of the Week and save immediately.
  const addTag = async () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      setTags(newTags);
      setTagInput('');
      await saveThemeOfTheWeek(newTags);
    }
  };

  // Remove a tag from Theme of the Week and save immediately.
  // Also remove it from Theme of the Day if it was selected.
  const removeTag = async (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    await saveThemeOfTheWeek(newTags);
    
    // If the removed tag was selected for the day, update the day selections.
    if (dayThemes.includes(tagToRemove)) {
      const newDayThemes = dayThemes.filter(tag => tag !== tagToRemove);
      setDayThemes(newDayThemes);
      await saveThemeOfTheDay(newDayThemes);
    }
  };

  // Handle checkbox changes for Theme of the Day.
  const handleDayThemeChange = async (e, tag) => {
    let newDayThemes = [];
    if (e.target.checked) {
      newDayThemes = [...dayThemes, tag];
    } else {
      newDayThemes = dayThemes.filter(t => t !== tag);
    }
    setDayThemes(newDayThemes);
    await saveThemeOfTheDay(newDayThemes);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Theme Management</h1>
      </header>

      {/* Section 1: Theme of the Week */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Theme of the Week</h2>
        <div style={styles.inputRow}>
          <input
            type="text"
            style={styles.tagInput}
            placeholder="Enter a tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <button style={styles.addButton} onClick={addTag}>
            Add Tag
          </button>
        </div>
        <div style={styles.tagContainer}>
          {tags.map((tag) => (
            <span key={tag} style={styles.tag} onClick={() => removeTag(tag)}>
              {tag} &times;
            </span>
          ))}
        </div>
      </div>

      {/* Section 2: Theme of the Day */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Theme of the Day</h2>
        <div style={styles.checkboxList}>
          {tags.length ? (
            tags.map((tag) => (
              <label key={tag} style={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={dayThemes.includes(tag)}
                  onChange={(e) => handleDayThemeChange(e, tag)}
                  style={{ marginRight: '8px' }}
                />
                {tag}
              </label>
            ))
          ) : (
            <p>No tags created yet.</p>
          )}
        </div>
      </div>

      <button style={styles.backButton} onClick={() => navigate('/')}>
        Back to Home
      </button>
    </div>
  );
};

export default ThemeManagement;
