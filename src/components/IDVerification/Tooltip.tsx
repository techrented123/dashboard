import React, { useState } from "react";

const Tooltip = ({
  text,
  children,
}: {
  text: string | React.ReactNode;
  children: any;
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative"
      onClick={() => setVisible((prev) => !prev)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white text-gray-700 text-sm p-2 rounded shadow-lg">
        {text}
      </div>}
    </div>
  );
};

export default Tooltip;
