import React from "react";
import { styled } from "@mui/material/styles";
import withSnackbar from "components/WithSnackbar";

import Button from "@mui/material/Button";

import Informationbar from "./components/Informationbar";
import Toolbar from "./components/Toolbar";
import AffectedEstates from "./components/AffectedEstates";
import AttributeEditor from "./components/AttributeEditor";

const Root = styled("div")(({ theme }) => ({
  textAlign: "center",
  padding: theme.spacing(1),
}));

class MarkisConnectionView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      userMode: props.model.markisParameters.userMode,
      type: props.model.markisParameters.type,
      objectId: props.model.markisParameters.objectId,
      editFeatureId: props.model.editFeatureId,
      featuresExist: props.model.geometriesExist,
    };

    this.localObserver = this.props.localObserver;
    this.globalObserver = this.props.app.globalObserver;

    this.subscriptions = [
      this.localObserver.subscribe("markisMessageEvent", (message) => {
        this.showAdvancedSnackbar(message.message, message.variant);
        if (message.reset) {
          this.reset();
        }
      }),

      this.localObserver.subscribe("show-existing-contract", (_message) => {
        this.updateState();
      }),

      this.localObserver.subscribe("create-contract", (_message) => {
        this.updateState();
      }),

      this.localObserver.subscribe("search-results-cleared", (_message) => {
        this.updateState();
      }),
    ];
  }

  componentWillUnmount() {
    this.subscriptions.forEach((subscription) => subscription.unsubscribe());
  }

  updateState() {
    this.setState({
      userMode: this.props.model.markisParameters.userMode,
      type: this.props.model.markisParameters.type,
      objectId: this.props.model.markisParameters.objectId,
      editFeatureId: this.props.model.editFeatureId,
      featuresExist: this.props.model.geometriesExist,
    });
  }

  showAdvancedSnackbar = (message, variant) => {
    const action = (key) => (
      <>
        <Button
          onClick={() => {
            this.props.closeSnackbar(key);
          }}
        >
          {"Stäng"}
        </Button>
      </>
    );

    this.props.enqueueSnackbar(message, {
      variant: variant || "error",
      autoHideDuration: 7000,
      persist: false,
      action,
    });
  };

  reset() {
    this.props.model.reset();
    this.setState({
      userMode: this.props.model.markisParameters.userMode,
      type: this.props.model.markisParameters.type,
      objectId: undefined,
      editFeatureId: undefined,
      featuresExist: undefined,
    });
  }

  render() {
    return (
      <>
        <Root>
          <Informationbar
            model={this.props.model}
            observer={this.props.localObserver}
            userMode={this.state.userMode}
            type={this.state.type}
            objectId={this.state.objectId}
          />
        </Root>
        <div>
          <AffectedEstates
            model={this.props.model}
            localObserver={this.props.localObserver}
          ></AffectedEstates>
        </div>
        <div>
          <Toolbar
            model={this.props.model}
            observer={this.props.localObserver}
            messageHandler={this.showAdvancedSnackbar}
            panel={this}
            userMode={this.state.userMode}
            type={this.state.type}
          />
        </div>
        <div>
          <AttributeEditor
            model={this.props.model}
            observer={this.props.localObserver}
            messageHandler={this.showAdvancedSnackbar}
          />
        </div>
      </>
    );
  }
}

export default withSnackbar(MarkisConnectionView);
