import React from "react";

import { Button, Select, Spinner } from "@instructure/ui";

import { parseResponse, urlParams } from "../../util";

class SelectField extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            options: [],
            isShowingOptions: false,
            highlightedOptionId: null,
            selectedOption: null,
            selectedOptionId: null
        };
        this.refresh = this.refresh.bind(this);
        this.handleShowOptions = this.handleShowOptions.bind(this);
        this.handleHideOptions = this.handleHideOptions.bind(this);
        this.handleHighlightOption = this.handleHighlightOption.bind(this);
        this.handleSelectOption = this.handleSelectOption.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentDidMount() {
        if (this.props.type !== null) this.refresh();
    }

    componentDidUpdate(prevProps) {
        if (this.props.type !== prevProps.type) {
            this.setState({ isLoading: true });
            this.refresh();
        }
    }

    refresh() {
        parseResponse(
            fetch(
                urlParams(window.injectedEnv.API_URL, "/api/timeedit/fields", {
                    extid: this.props.type
                })
            ),
            json => {
                this.setState({
                    options: json.filter(
                        field => !this.props.existingFields.includes(field)
                    ),
                    isLoading: false,
                    inputValue: json[0],
                    selectedOptionId: json[0]
                });
            }
        );
    }

    handleShowOptions() {
        this.setState({
            isShowingOptions: true
        });
    }

    handleHideOptions() {
        this.setState({
            isShowingOptions: false,
            highlightedOptionId: null
        });
    }

    handleBlur() {
        this.setState({ highlightedOptionId: null });
    }

    handleHighlightOption(event, { id }) {
        event.persist();
        this.setState({
            selectedOptionId: id,
            highlightedOptionId: id,
            inputValue: id
        });
    }

    handleSelectOption(_, { id }) {
        this.setState({
            selectedOptionId: id,
            inputValue: id,
            isShowingOptions: false
        });
        // this.props.setField(id);
        console.log("setField", id);
    }

    handleSubmit() {
        if (
            this.state.options.some(
                field => field === this.state.selectedOptionId
            )
        ) {
            this.props.onSubmit(this.state.selectedOptionId);
        }
    }

    render() {
        const {
            isLoading,
            options,
            inputValue,
            isShowingOptions,
            highlightedOptionId,
            selectedOptionId
        } = this.state;

        return (
            <>
                {isLoading ? (
                    <Spinner renderTitle="Loading" />
                ) : (
                    <>
                        <Select
                            renderLabel="Object Field"
                            inputValue={inputValue}
                            isShowingOptions={isShowingOptions}
                            onBlur={this.handleBlur}
                            onRequestShowOptions={this.handleShowOptions}
                            onRequestHideOptions={this.handleHideOptions}
                            onRequestHighlightOption={
                                this.handleHighlightOption
                            }
                            onRequestSelectOption={this.handleSelectOption}
                        >
                            {options.length > 0 ? (
                                options.map(field => {
                                    return (
                                        <Select.Option
                                            id={field}
                                            key={field}
                                            value={field}
                                            isHighlighted={
                                                field === highlightedOptionId
                                            }
                                            isSelected={
                                                field === selectedOptionId
                                            }
                                        >
                                            {field}
                                        </Select.Option>
                                    );
                                })
                            ) : (
                                <Select.Option
                                    id="empty-option"
                                    key="empty-option"
                                ></Select.Option>
                            )}
                        </Select>
                        <div style={{ marginBottom: 10 }}>
                            <Button margin="small" onClick={this.handleSubmit}>
                                Submit
                            </Button>
                            <Button onClick={this.props.onCancel}>
                                Cancel
                            </Button>
                        </div>
                    </>
                )}
            </>
        );
    }
}

export default SelectField;
