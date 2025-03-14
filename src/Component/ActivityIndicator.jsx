// Component/ActivityIndicator.jsx
import React from "react";
import { ImSpinner2 } from "react-icons/im"; // react-icons spinner icon

const ActivityIndicator = ({ message = "Loading...", size = "text-4xl", color = "text-blue-500" }) => {
  return (
    <div className="flex flex-col items-center justify-center py-6">
      <ImSpinner2 className={`animate-spin ${size} ${color}`} />
      {message && <p className="mt-4 text-gray-700 text-sm">{message}</p>}
    </div>
  );
};

export default ActivityIndicator;
