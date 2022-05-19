import React from "react";

import { Button, TextArea, TextInput } from "@instructure/ui";

import { urlParams } from "../util";

class Config extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            title: "",
            location: "",
            description: ""
        };

        this.refresh = this.refresh.bind(this);
        this.handleChange = this.handleChange.bind(this);
        this.submit = this.submit.bind(this);
    }

    componentDidMount() {
        this.refresh();
    }

    refresh() {
        for (let k of ["title", "location", "description"]) {
            fetch(
                urlParams(window.injectedEnv.BACKEND_URL, "/api/config", {
                    key: k
                })
            )
                .then(resp => {
                    if (resp.status !== 200)
                        throw new Error(
                            `Unexpected HTTP response from backend: ${resp.status}`
                        );
                    return resp.text();
                })
                .then(v => {
                    this.setState({ [k]: v });
                });
        }
    }

    submit() {
        for (let k of ["title", "location", "description"]) {
            fetch(
                urlParams(window.injectedEnv.BACKEND_URL, "/api/config", {
                    key: k,
                    value: this.state[k]
                }),
                {
                    method: "PUT"
                }
            ).then(resp => {
                if (resp.status !== 200)
                    throw new Error(
                        `Unexpected HTTP response from backend: ${resp.status}`
                    );
            });
        }
    }

    handleChange(k, v) {
        this.setState({ [k]: v });
    }

    render() {
        return (
            <div id="config">
                <KeyValue
                    key_="title"
                    label="Title"
                    value={this.state.title}
                    handleChange={this.handleChange}
                />
                <KeyValue
                    key_="location"
                    label="Location"
                    value={this.state.location}
                    handleChange={this.handleChange}
                />
                <KeyValue
                    big={true}
                    key_="description"
                    label="Description"
                    value={this.state.description}
                    handleChange={this.handleChange}
                />
                <Button onClick={this.submit}>Save and apply</Button>
                &nbsp;
                <Button onClick={this.refresh}>Discard edits</Button>
            </div>
        );
    }
}

class KeyValue extends React.Component {
    render() {
        return (
            <div className="key-value">
                {this.props.big ? (
                    <BigKeyValue {...this.props} />
                ) : (
                    <SmallKeyValue {...this.props} />
                )}
            </div>
        );
    }
}

class SmallKeyValue extends React.Component {
    render() {
        return (
            <TextInput
                renderLabel={this.props.label}
                value={this.props.value}
                onChange={e =>
                    this.props.handleChange(this.props.key_, e.target.value)
                }
            />
        );
    }
}

class BigKeyValue extends React.Component {
    render() {
        return (
            <TextArea
                label={this.props.label}
                value={this.props.value}
                onChange={e =>
                    this.props.handleChange(this.props.key_, e.target.value)
                }
            />
        );
    }
}

export default Config;
