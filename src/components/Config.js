import React from "react";

import { Button, Grid, GridCol, Heading, IconPlusLine, IconTrashLine, SimpleSelect, Tag, TextArea, TextInput, View } from "@instructure/ui";

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
                    name="Title"
                    children={this.state.title}
                    onDelete={this.handleDelete}
                />
                <ConfigSection
                    name="Location"
                    children={this.state.location}
                    onDelete={this.handleDelete}
                    />
                <ConfigSection
                    name="Description"
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
                                <Heading level="h2">{this.props.name}</Heading>
                            </Grid.Col>
                            <Grid.Col width="auto">
            <Button
                renderIcon={IconPlusLine}
                margin="small"
                color="primary"
            >
                Add {this.props.name.toLowerCase()} field
            </Button>

                            </Grid.Col>
                        </Grid.Row>
                    </Grid>
            {this.props.children && this.props.children.map(c => 
                <Button
                    key={c.id}
                    onClick={() => this.props.onDelete(c.id)}
                    renderIcon={IconTrashLine}
                    >
                    <strong>{c.te_type}</strong> - {c.te_fields.join('.')}
                </Button>
                )}
                </View>

    )}
}