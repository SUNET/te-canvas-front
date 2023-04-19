import React from "react";

import { Button, Heading, IconPlusLine, SimpleSelect, TextArea, TextInput, View } from "@instructure/ui";

import { urlParams } from "../util";

class Config extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
             title: [],
             location: [],
             description: []
        };

        this.refresh = this.refresh.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.submit = this.submit.bind(this);
    }

    componentDidMount() {
        this.refresh();
    }

    refresh() {
            fetch(
                urlParams(window.injectedEnv.API_URL, "/api/config/template")
            )
                .then(resp => {
                    if (resp.status !== 200)
                        throw new Error(
                            `Unexpected HTTP response from backend: ${resp.status}`
                        );
                    return resp.json()
                })
                .then(data => this.setState(data)
            )
    }

    submit() {
        // for (let k of ["title", "location", "description"]) {
        //     fetch(
        //         urlParams(window.injectedEnv.API_URL, "/api/config", {
        //             key: k,
        //             value: this.state[k]
        //         }),
        //         {
        //             method: "PUT"
        //         }
        //     ).then(resp => {
        //         if (resp.status !== 200)
        //             throw new Error(
        //                 `Unexpected HTTP response from backend: ${resp.status}`
        //             );
        //     });
        // }
    }

    handleChange(k, v) {
        // this.setState({ [k]: v });
    }

    render() {
        return (
            <div id="config">
                <Heading level="h2">Title</Heading>
                <View
                display="block"
                borderRadius="medium"
                borderWidth="small"
                background="secondary"
                padding="medium"
                margin="small"
                >
            <Button
                renderIcon={IconPlusLine}
                margin="small"
                color="success"
            >
                Add title field
            </Button>
            {this.state.title && this.state.title.map(r => r.te_type)}
                </View>
                <Heading level="h2">Location</Heading>
                <View
                display="block"
                borderRadius="medium"
                borderWidth="small"
                background="secondary"
                padding="medium"
                margin="small"
                >
            <Button
                renderIcon={IconPlusLine}
                margin="small"
                color="success"
            >
                Add location field
            </Button>
            {this.state.location && this.state.location.map(r => r.te_type)}
                </View>
                <Heading level="h2">Description</Heading>

                <View
                display="block"
                borderRadius="medium"
                borderWidth="small"
                background="secondary"
                padding="medium"
                margin="small"
                >
            <Button
                renderIcon={IconPlusLine}
                margin="small"
                color="success"
            >
                Add description field
            </Button>
            {this.state.description && this.state.description.map(r => r.te_type)}
                </View>
                <Button onClick={this.submit}>Save and apply</Button>
                &nbsp;
                <Button onClick={this.refresh}>Discard edits</Button>
            </div>
        );
    }
}

export default Config;
