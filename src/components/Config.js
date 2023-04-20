import React from "react";

import { Button, Grid, GridCol, Heading, IconPlusLine, IconTrashLine, Modal, SimpleSelect, Tag, TextArea, TextInput, View } from "@instructure/ui";

import { parseResponse, urlParams } from "../util";

class Config extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
             title: [],
             location: [],
             description: []
        };
        this.refresh = this.refresh.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
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

    handleDelete(id) {
        fetch(urlParams(window.injectedEnv.API_URL, "/api/config/template",{ id: id }),
        { method: "DELETE"}).then(resp => {
            if (resp.status !== 204)
                throw new Error(`Unexpected HTTP response from backend: ${resp.status}`)
            this.setState({
                title: this.state.title.filter(n => n.id !== id),
                location: this.state.location.filter(n => n.id !== id),
                description: this.state.description.filter(n => n.id !== id),
            })
        })
    }

    render() {
        return (
            <div id="config">
                <ConfigSection
                    name="title"
                    children={this.state.title}
                    onDelete={this.handleDelete}
                />
                <ConfigSection
                    name="location"
                    children={this.state.location}
                    onDelete={this.handleDelete}
                    />
                <ConfigSection
                    name="description"
                    children={this.state.description}
                    onDelete={this.handleDelete}
                />    
            </div>
        );
    }
}

export default Config;

class ConfigSection extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            addNew: false
        }
    }

    render() {
        return (
                <View
                display="block"
                borderRadius="medium"
                borderWidth="small"
                background="secondary"
                padding="medium"
                margin="small"
                >
                    <Grid>
                        <Grid.Row>
                            <Grid.Col>
                                <Heading level="h2">{this.props.name.charAt(0).toUpperCase()}{this.props.name.slice(1)}</Heading>
                            </Grid.Col>
                            <Grid.Col width="auto">
                                <Button
                                    renderIcon={IconPlusLine}
                                    margin="small"
                                    color="primary"
                                    onClick={() => this.setState({ addNew: !this.state.addNew })}
                                >
                                    Add {this.props.name} field
                                </Button>
                            </Grid.Col>
                        </Grid.Row>
                        <Grid.Row>
                            <AddNew 
                                type={this.props.name}
                                active={this.state.addNew} />
                        </Grid.Row>
            {this.props.children && this.props.children.map(c => 
                <Grid.Row>
                    <Button
                        key={c.id}
                        onClick={() => this.props.onDelete(c.id)}
                        renderIcon={IconTrashLine}>
                        <strong>{c.te_type}</strong> - {c.te_fields.join('.')}
                    </Button>
                </Grid.Row>
                )}
                    </Grid>
                </View>

    )}
}

class AddNew extends React.Component {
    constructor(props) {
        super(props)
    }

    render() {
        return (
            <div>
            {this.props.active && <AddNewForm />}
            </div>
        )
    }
}

class AddNewForm extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            types: []
        }
    }
    
    componentDidMount() {
        let promise = fetch(
            urlParams(window.injectedEnv.API_URL, "/api/timeedit/types", {})
        );
        parseResponse(promise, json => {
            this.setState({
                types: Object.entries(json).map(([k, v]) => ({
                    extid: k,
                    title: v
                })),
                // If the types include "courseevt" we set this as active.
                // Otherwise just pick the first type.
                type: Object.keys(json).some(x => x === "courseevt")
                    ? "courseevt"
                    : Object.keys(json)[0]
            });
        });
    }

    handleSelect() {
        console.log("handleSelect()")
    }

    render() {
        return (
                <SimpleSelect
                    renderLabel="Object Type"
                    value={this.state.type}
                    onChange={this.handleSelect("type")}
                >
                    {this.state.types.map(t => (
                        <SimpleSelect.Option
                            key={t.extid}
                            id={t.extid}
                            value={t.extid}
                        >
                            {t.title}
                        </SimpleSelect.Option>
                    ))}
                </SimpleSelect>
        )
    }
}