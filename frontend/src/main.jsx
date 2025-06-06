// Importing StrictMode for highlighting potential problems in an application
import { StrictMode } from "react";
// Importing createRoot for rendering the React application
import { createRoot } from "react-dom/client";
// Importing global CSS styles
import "./index.css";
// Importing the main App component
import App from "./App.jsx";
// Importing the AuthProvider for managing authentication context
import { AuthProvider } from "./context/authProvider";

// Rendering the application inside the root DOM element
createRoot(document.getElementById("root")).render(
  <StrictMode>
      {/* Wrapping the App component with AuthProvider to provide authentication context */}
      <AuthProvider>
        <App />
      </AuthProvider>
  </StrictMode>
);
