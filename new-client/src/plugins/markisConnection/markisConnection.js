import React from "react";
import BaseWindowPlugin from "../BaseWindowPlugin";

import DesktopWindowsIcon from "@material-ui/icons/DesktopWindows";

import MarkisConnectionModel from "./MarkisConnectionModel";
import MarkisConnectionView from "./MarkisConnectionView";
import Observer from "react-event-observer";

class MarkisConnection extends React.PureComponent {
  constructor(props) {
    super(props);
    this.localObserver = Observer();

    this.sessionId = this.getUrlParams("sid");

    this.localObserver.subscribe("create-contract", (message) => {
      props.app.globalObserver.publish("markisconnection.showWindow", {
        runCallBack: false,
        hideOtherPluginWindows: false,
      });
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
    }
  }

  renderDrawerContent = () => {
    return (
      <div>
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

export default MarkisConnection;
