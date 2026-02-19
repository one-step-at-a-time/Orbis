import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { PlayerProvider } from './context/PlayerContext';
import { MissionProvider } from './context/MissionContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <DataProvider>
          <PlayerProvider>
            <MissionProvider>
              <App />
            </MissionProvider>
          </PlayerProvider>
        </DataProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
