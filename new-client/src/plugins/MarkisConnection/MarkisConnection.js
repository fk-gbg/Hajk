import React from "react";

import DesktopWindowsIcon from "@material-ui/icons/DesktopWindows";
import { withStyles } from "@material-ui/core/styles";
import { withSnackbar } from "notistack";

import MarkisConnectionModel from "./MarkisConnectionModel";
import MarkisConnectionView from "./MarkisConnectionView";
import Observer from "react-event-observer";

const styles = (theme) => ({
  root: {
    backgroundColor: theme.palette.background.default,
    maxHeight: "80vh",
    overflow: "hidden",
  },
});
class MarkisConnection extends React.PureComponent {
  constructor(props) {
    super(props);
    this.localObserver = Observer();

    this.sessionId = this.getUrlParams("sid");

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
    const { classes } = this.props;
    return (
      <div className={classes.root}>
        <MarkisConnectionView
          model={this.MarkisConnectionModel}
          app={this.props.app}
          localObserver={this.localObserver}
        />
      </div>
    );
  };

  addDrawerToggleButton = () => {
    const { app } = this.props;
    app.globalObserver.publish("core.addDrawerToggleButton", {
      value: "markisconnection",
      ButtonIcon: DesktopWindowsIcon,
      caption: "Markiskoppling",
      order: 100,
      renderDrawerContent: this.renderDrawerContent,
    });
  };

  render() {
    if (this.sessionId) {
      return <>{this.addDrawerToggleButton()}</>;
    } else {
      return <></>;
    }
  }
}

export default withStyles(styles)(withSnackbar(MarkisConnection));
