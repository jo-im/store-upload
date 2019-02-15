import React from "react";
import { ChromePicker } from "react-color";

const ColorPicker = props => {
  const { changeColor, color, element } = props;

  return (
    <div>
      <p>{element} color</p>
      <ChromePicker color={color} onChange={changeColor} />
    </div>
  );
};

export default ColorPicker;