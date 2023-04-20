import React from "react";

import { Button, Heading, IconPlusLine, IconTrashLine, SimpleSelect, TextArea, TextInput, View } from "@instructure/ui";

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
        console.log("delete",id)
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
            {this.state.title && this.state.title.map(r => 
                <Button key={r.id} renderIcon={IconTrashLine} onClick={() => this.handleDelete(r.id)} >
                    <strong>{r.te_type}</strong> - {r.te_fields.join('.')}
                </Button>
                )}
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
            {this.state.location && this.state.location.map(r =>
                <Button key={r.id} renderIcon={IconTrashLine} onClick={() => this.handleDelete(r.id)} >
                    <strong>{r.te_type}</strong> - {r.te_fields.join('.')}
                </Button>
                )}
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
            {this.state.description && this.state.description.map(r => 
                <Button key={r.id} renderIcon={IconTrashLine} onClick={() => this.handleDelete(r.id)} >
                    <strong>{r.te_type}</strong> - {r.te_fields.join('.')}
                </Button>
            )}
                </View>
            </div>
        );
    }
}

export default Config;
