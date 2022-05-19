import React from "react";

import { Heading, InstUISettingsProvider, Tabs, canvas } from "@instructure/ui";

import "../style.css";
import Config from "./Config";
import Sync from "./Sync";

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            activeTab: 0
        };
        this.handleTabChange = this.handleTabChange.bind(this);
    }

    handleTabChange(_, { index }) {
        this.setState({
            activeTab: index
        });
    }

    render() {
        return (
            <InstUISettingsProvider theme={canvas}>
                <div id="main">
                    <Heading border="bottom">TimeEdit Sync</Heading>
                    <Tabs
                        variant="secondary"
                        onRequestTabChange={this.handleTabChange}
                    >
                        <Tabs.Panel
                            renderTitle="Sync Objects"
                            isSelected={this.state.activeTab === 0}
                        >
                            <Sync />
                        </Tabs.Panel>
                        <Tabs.Panel
                            renderTitle="Event Template"
                            isSelected={this.state.activeTab === 1}
                        >
                            <Config />
                        </Tabs.Panel>
                    </Tabs>
                </div>
            </InstUISettingsProvider>
        );
    }
}

export default App;
