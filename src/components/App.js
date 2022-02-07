import React from "react";

import { Button, InstUISettingsProvider, canvas } from "@instructure/ui";

import "../style.css";

class App extends React.Component {
    render() {
        return (
            <InstUISettingsProvider theme={canvas}>
                <Button>Hello from InstUI!</Button>
            </InstUISettingsProvider>
        );
    }
}

export default App;
