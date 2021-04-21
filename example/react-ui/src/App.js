import React from "react";
import PropTypes from "prop-types";
import Box from "@material-ui/core/Box";

import Web3_Custom_EIP712Sign from "./components/Web3_Custom_EIP712Sign";

import "./App.css";

import "react-notifications/lib/notifications.css";

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      className="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}>
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.any.isRequired,
  value: PropTypes.any.isRequired,
};

function App() {
  return <Web3_Custom_EIP712Sign />;
}

export default App;
