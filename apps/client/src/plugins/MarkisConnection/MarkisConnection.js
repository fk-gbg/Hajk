import React from "react";

import { styled } from "@mui/material/styles";
import MonitorIcon from "@mui/icons-material/Monitor";
import withSnackbar from "components/WithSnackbar";

import MarkisConnectionModel from "./MarkisConnectionModel";
import MarkisConnectionView from "./MarkisConnectionView";
import Observer from "react-event-observer";

const Root = styled("div")(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  overflowX: "hidden",
}));

class MarkisConnection extends React.PureComponent {
  constructor(props) {
    super(props);
    this.localObserver = Observer();

    this.sessionId = this.getUrlParams("sid");

    if (this.sessionId) {
      this.addDrawerToggleButton();
    }

    this.localObserver.subscribe("create-contract", (message) => {
      this.props.app.globalObserver.publish(
        "core.drawerContentChanged",
        "markisconnection"
      );
    });

    this.MarkisConnectionModel = new MarkisConnectionModel({
      map: props.map,
      app: props.app,
      localObserver: this.localObserver,
      options: props.options,
    });
  }

  getUrlParams(name) {
    var match = RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, " "));
  }

  componentDidMount() {
    if (this.sessionId !== undefined && this.sessionId !== null) {
      if (!this.MarkisConnectionModel.isConnected) {
        this.MarkisConnectionModel.connectToHub(this.sessionId);
      }
    } else {
      if (
        window.localStorage.getItem("activeDrawerContent") ===
        "markisconnection"
      ) {
        if (window.localStorage.getItem("drawerPermanent") === "true") {
          this.props.app.globalObserver.publish(
            "core.drawerContentChanged",
            "plugins"
          );
        } else {
          this.props.app.globalObserver.publish(
            "core.drawerContentChanged",
            null
          );
        }
      }
    }
  }

  renderDrawerContent = () => {
    return (
      <Root>
        <MarkisConnectionView
          model={this.MarkisConnectionModel}
          app={this.props.app}
          localObserver={this.localObserver}
        />
      </Root>
    );
  };

  addDrawerToggleButton = () => {
    const { app } = this.props;
    app.globalObserver.publish("core.addDrawerToggleButton", {
      value: "markisconnection",
      ButtonIcon: MonitorIcon,
      caption: "Markiskoppling",
      drawerTitle: "Markiskoppling",
      order: 100,
      renderDrawerContent: this.renderDrawerContent,
    });
  };

  render() {
    return null;
  }
}

export default withSnackbar(MarkisConnection);
