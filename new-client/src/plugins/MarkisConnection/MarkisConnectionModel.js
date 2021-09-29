import * as signalR from "@microsoft/signalr";
import intersect from "@turf/intersect";
import kinks from "@turf/kinks";
import { WFS } from "ol/format";
import GeometryType from "ol/geom/GeometryType";
import IsLike from "ol/format/filter/IsLike";
import Intersects from "ol/format/filter/Intersects";
import Or from "ol/format/filter/Or";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Vector from "ol/layer/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { arraySort } from "../../utils/ArraySort.js";
import { Draw } from "ol/interaction";
import X2JS from "x2js";
import { handleClick } from "../../models/Click.js";
import { Modify } from "ol/interaction.js";
import Collection from "ol/Collection.js";
import { Feature } from "ol";
import { validateMessageParameters } from "./utils/MessageValidator.js";
import {
  getSketchStyle,
  getHighlightStyle,
  getHiddenStyle,
  getStyleFromValues,
} from "./utils/FeatureStyle.js";

class MarkisConnectionModel {
  constructor(settings) {
    this.map = settings.map;
    this.app = settings.app;
    this.options = settings.options;
    this.localObserver = settings.localObserver;
    this.isConnected = false;
    this.promptForAttributes = false;
    this.geometriesExist = false;
    this.featureModified = false;
    this.editingExisting = false;
    this.type = "Polygon";
    this.markisParameters = {};
    this.featureIdCounter = 1;
    this.createMethod = "abort";
    this.geometryName = "geom";
    this.wfsParser = new WFS();
    this.controllers = [];
    this.userSelectedStyle = null;
    this.vectorSource = new VectorSource({});
    this.searchResultLayer = new VectorLayer({
      source: new VectorSource({}),
      style: getSketchStyle,
    });
    this.map.addLayer(this.searchResultLayer);
    this.searchResultLayer.set("type", "markisResultLayer");
    this.searchResultLayer.set("queryable", true);
  }

  setEditLayer(layerName) {
    this.editSource = this.options.wfstSources.find(
      (wfstSource) => wfstSource.layers[0] === layerName
    );
    this.promptForAttributes = this.editSource.editableFields.length > 0;
    this.editLayer = new Vector({
      source: this.vectorSource,
      style: getSketchStyle,
    });

    if (this.editLayer) {
      this.map.removeLayer(this.editLayer);
    }
    this.map.addLayer(this.editLayer);
  }

  refreshLayersByIds = (layerIds) => {
    let layers = this.getLayersByIds(layerIds);

    if (layers && layers.length > 0) {
      layers.forEach((layer) => {
        if (layer instanceof Vector) {
          layer.getSource().refresh({ force: true });
        } else {
          const source = layer.getSource();
          source.changed();
          source.updateParams({ time: Date.now() });
          this.map.updateSize();
        }
      });
    }
  };

  /**Returns the data source connected to the prefix of the contract ID */
  getContractSource() {
    const prefix = this.markisParameters.objectId.slice(0, 2).toUpperCase();
    for (var i = 0; i < this.options.wfstSources.length; i++) {
      if (this.options.wfstSources[i].prefixes.indexOf(prefix) > -1) {
        return this.options.wfstSources[i].layers[0];
      }
    }
  }

  /**Lets the user select existing features for editing. Only handles single select and is restricted to polygon*/
  onSelectFeatures = (evt) => {
    if (this.promptForAttributes && this.editFeatureId) {
      this.publishMessage(
        "Du måste ange attribut på ytan innan du kan skapa en ny!",
        "error",
        false
      );
    } else {
      handleClick(evt, evt.map, (response) => {
        if (response.features.length === 1) {
          const estateFeature = response.features[0];
          const geometryType = estateFeature.getGeometry().getType();
          if (geometryType === GeometryType.POLYGON) {
            let feature = new Feature({});
            feature.setGeometryName(this.geometryName);
            feature.setGeometry(estateFeature.getGeometry());
            feature.modification = "added";
            feature.setId(this.featureIdCounter);
            this.editFeatureId = this.featureIdCounter;
            this.featureIdCounter++;
            this.vectorSource.addFeature(feature);
            this.geometriesExist = true;
            this.localObserver.publish("feature-added", this.vectorSource);
          }
        }
      });
    }
  };

  setFeatureProperties() {
    this.vectorSource.forEachFeature((feature) => {
      feature.setGeometryName(this.geometryName);
      feature.unset("bbox", true);
      if (this.editSource.setProperties) {
        this.editSource.setProperties.forEach((property) => {
          if (property.fromMarkis) {
            feature.setProperties({
              [property.columnName]: this.markisParameters[property.value],
            });
          } else {
            feature.setProperties({
              [property.columnName]: [property.value],
            });
          }
        });
      }
    });
  }

  setType(type) {
    this.type = type;
    this.removeInteraction();
    this.addInteraction();
  }

  addInteraction() {
    this.draw = new Draw({
      source: this.vectorSource,
      type: this.type,
      style: this.userSelectedStyle ?? getSketchStyle(),
      geometryName: this.geometryName,
    });

    this.draw.on("drawend", (event) => {
      this.handleDrawEnd(event);
    });

    this.map.addInteraction(this.draw);
    this.map.snapHelper.add("markisconnection");
  }

  handleDrawEnd = (event) => {
    if (this.promptForAttributes && this.editFeatureId) {
      this.publishMessage(
        "Du måste ange attribut på ytan innan du kan skapa en ny!",
        "error",
        false
      );
      this.vectorSource.once("addfeature", (event) => {
        const feature = event.feature;
        this.vectorSource.removeFeature(feature);
      });
    } else {
      event.feature.modification = "added";
      event.feature.setId(this.featureIdCounter);
      this.editFeatureId = this.featureIdCounter;
      this.featureIdCounter++;
      this.geometriesExist = true;
      this.localObserver.publish("feature-added");
    }
  };

  resetEditFeatureId() {
    this.editFeatureId = undefined;
    this.featureModified = true;
    this.localObserver.publish("edit-feature-reset");
  }

  removeInteraction() {
    if (this.draw) {
      this.map.removeInteraction(this.draw);
      this.map.snapHelper.delete("markisconnection");
    }
    if (this.edit) {
      this.map.removeInteraction(this.edit);
      this.map.snapHelper.delete("markisconnection");
    }
    this.editFeatureId = undefined;
    this.map.un("singleclick", this.removeSelected);
    this.map.un("singleclick", this.onSelectFeatures);
    this.map.un("singleclick", this.selectForEdit);
    this.map.clickLock.delete("markisconnection");
  }

  removeSelected = (e) => {
    this.map.forEachFeatureAtPixel(e.pixel, (feature) => {
      if (this.vectorSource.getFeatures().some((f) => f === feature)) {
        if (
          feature.modification === "added" ||
          feature.modification === undefined
        ) {
          feature.modification = undefined;
        } else {
          feature.modification = "removed";
        }
        feature.setStyle(getHiddenStyle);
        this.geometriesExist =
          this.vectorSource
            .getFeatures()
            .filter(
              (feature) =>
                ["added", "updated"].indexOf(feature.modification) > -1
            ).length > 0;
        this.featureModified = true;
        this.localObserver.publish("feature-deleted-by-user");
      }
    });
  };

  updateFeatureStyle = (strokeColor, fillColor, strokeWidth) => {
    const style = getStyleFromValues(strokeColor, fillColor, strokeWidth);
    this.userSelectedStyle = style;
    if (this.markisParameters.userMode === "Show") {
      this.searchResultLayer
        .getSource()
        .getFeatures()
        .forEach((feature) => {
          feature.setStyle(style);
        });
    } else {
      this.vectorSource.forEachFeature((feature) => {
        this.editLayer.setStyle(style);
        if (feature.modification && feature.modification !== "removed") {
          feature.setStyle(style);
        }
      });
    }
  };

  removeHighlight() {
    this.vectorSource.getFeatures().forEach((feature) => {
      if (feature.modification && feature.modification !== "removed") {
        feature.setStyle(this.userSelectedStyle ?? getSketchStyle);
      }
    });
  }

  selectForEdit = (e) => {
    this.map.forEachFeatureAtPixel(e.pixel, (feature) => {
      if (this.vectorSource.getFeatures().some((f) => f === feature)) {
        this.removeHighlight();
        this.editFeatureId = feature.getId();
        feature.setStyle(getHighlightStyle);
      }
      this.localObserver.publish("feature-selected-for-edit");
    });
  };

  setEditActive() {
    let features = new Collection();
    this.vectorSource.getFeatures().forEach((feature) => {
      features.push(feature);
    });
    this.edit = new Modify({ features: features });
    this.map.addInteraction(this.edit);
    this.map.snapHelper.add("markisconnection");

    this.edit.on("modifyend", (event) => {
      this.featureModified = true;
      this.localObserver.publish("feature-modified");
    });
  }

  setCreateMethod(method) {
    this.removeHighlight();
    if (method) {
      this.createMethod = method;
    }
    this.removeInteraction();
    if (this.createMethod === "remove") {
      this.map.on("singleclick", this.removeSelected);
    }
    if (this.createMethod === "add") {
      this.type = "Polygon";
      this.setType(this.type);
    }
    if (this.createMethod === "addLine") {
      this.type = "LineString";
      this.setType(this.type);
    }
    if (this.createMethod === "addEstate") {
      this.map.on("singleclick", this.onSelectFeatures);
    }
    if (this.createMethod === "edit") {
      this.setEditActive();
    }
    if (this.createMethod === "editAttributes") {
      this.map.on("singleclick", this.selectForEdit);
    }
    if (this.createMethod === "abort") {
      this.map.clickLock.delete("markisconnection");
    } else {
      this.map.clickLock.add("markisconnection");
    }
  }

  /**Creates a timestamp without time zone suitable for the database */
  getTimeStampDate() {
    return new Date(new Date().toString().split("GMT")[0] + " UTC")
      .toISOString()
      .split(".")[0];
  }

  write(features) {
    const format = new WFS(),
      lr = this.editSource.layers[0].split(":"),
      fp = lr.length === 2 ? lr[0] : "",
      ft = lr.length === 2 ? lr[1] : lr[0],
      options = {
        featureNS: this.editSource.uri,
        featurePrefix: fp,
        featureType: ft,
        hasZ: false,
        version: "1.1.0", // or "1.0.0"
        srsName: this.editSource.projection,
      };
    return format.writeTransaction(
      features.inserts,
      features.updates,
      features.deletes,
      options
    );
  }

  parseWFSTresponse(response) {
    const str =
      typeof response !== "string"
        ? new XMLSerializer().serializeToString(response)
        : response;
    return new X2JS().xml2js(str);
  }

  transact(features, done) {
    let node = this.write(features),
      serializer = new XMLSerializer(),
      src = this.editSource,
      payload = node ? serializer.serializeToString(node) : undefined;
    //Quick fix for incorrect geometryname
    payload = payload.replace(new RegExp("<geometry>", "g"), "<geom>");
    payload = payload.replace(new RegExp("</geometry>", "g"), "</geom>");
    if (payload) {
      fetch(src.posturl, {
        method: "POST",
        body: payload,
        credentials: "same-origin",
        headers: {
          "Content-Type": "text/xml",
        },
      })
        .then((response) => {
          response.text().then((wfsResponseText) => {
            done(this.parseWFSTresponse(wfsResponseText));
          });
        })
        .catch((response) => {
          response.text().then((errorMessage) => {
            done(errorMessage);
          });
        });
    }
  }

  /**Updates the id:s on the features so that they are saved correctly.
   */
  updateFeatureIds(features) {
    if (features.inserts.length > 0) {
      features.inserts.forEach((feature) => {
        feature.setId(undefined);
        if (feature.getProperties().id) {
          feature.unset("id", true);
        }
      });
    }
    if (features.deletes.length > 0) {
      features.deletes.forEach((feature) => {
        feature.setId(feature.getProperties().id);
      });
    }
    if (features.updates.length > 0) {
      features.updates.forEach((feature) => {
        feature.setId(feature.getProperties().id);
      });
    }
  }

  save(done) {
    this.setFeatureProperties();

    const find = (mode) =>
      this.vectorSource
        .getFeatures()
        .filter((feature) => feature.modification === mode);

    const features = {
      updates: find("updated"),
      inserts: find("added"),
      deletes: find("removed"),
    };

    if (
      features.updates.length === 0 &&
      features.inserts.length === 0 &&
      features.deletes.length === 0
    ) {
      return done();
    }
    this.featuresToTransact = features;
    this.updateFeatureIds(this.featuresToTransact);
    this.transact(this.featuresToTransact, done);
    this.featuresToTransact = undefined;
  }

  clearSearchResult() {
    this.searchResultLayer.getSource().clear();
    Object.assign(this.markisParameters, {
      objectId: undefined,
    });
    this.localObserver.publish("search-results-cleared");
  }

  reset() {
    this.vectorSource.clear();
    this.searchResultLayer.getSource().clear();
    this.removeInteraction();
    if (this.sourceName && this.markisParameters.userMode === "Show") {
      this.toggleLayerById([this.editSource.activeLayers], false);
    }
    Object.assign(this.markisParameters, {
      objectId: undefined,
      objectSerial: undefined,
      objectStatus: undefined,
      createdBy: undefined,
      userMode: undefined,
      type: undefined,
      regDate: undefined,
    });
    this.sourceName = undefined;
    this.editingExisting = false;
    this.featureModified = false;
    this.editFeatureId = undefined;
    this.geometriesExist = false;
  }

  validateTradeGeometries() {
    var result = true;
    this.vectorSource.forEachFeature((feature) => {
      if (
        (!feature.getProperties().diarie_nr ||
          !feature.getProperties().gbg_fastnr) &&
        feature.modification === "added"
      ) {
        result = false;
      }
    });
    return result;
  }

  assignMessageParameters(message) {
    Object.assign(this.markisParameters, {
      objectId: (message.objectId || "").toUpperCase(),
      objectSerial: message.objectSerial,
      objectStatus: (message.objectStatus || "").toUpperCase(),
      createdBy: message.userName,
      regDate: this.getTimeStampDate(),
    });
  }

  /**Validates that each feature in the existing contract is ok before allowing
   * the user to create additional contract geometries
   */
  validateContract(foundContract) {
    let contractControl = { contractOk: false, type: undefined };
    const foundSerial = foundContract.properties.handlopnr;
    if (foundSerial) {
      if (foundContract.properties.status.toUpperCase() === "G") {
        if (foundSerial >= this.markisParameters.objectSerial) {
          Object.assign(contractControl, {
            contractOk: false,
            message: "Det finns redan en gällande avtalsyta.",
          });
          return contractControl;
        } else if (foundSerial < this.markisParameters.objectSerial) {
          Object.assign(contractControl, {
            contractOk: true,
            message:
              "Du skapar en tilläggsyta. Kom ihåg att radera den gamla ytan om du inte vill att den ska ingå.",
          });
          return contractControl;
        }
      } else if (foundContract.properties.status.toUpperCase() === "F") {
        if (
          foundContract.properties.handlopnr.toString() !==
          this.markisParameters.objectSerial
        ) {
          Object.assign(contractControl, {
            contractOk: false,
            message:
              "Det finns en förslagsyta med ett annat händelselöpnummer.",
          });
          return contractControl;
        }
        Object.assign(contractControl, {
          contractOk: true,
          message: "Du redigerar nu en förslagsyta.",
        });
        return contractControl;
      } else {
        Object.assign(contractControl, {
          contractOk: false,
          message: "De existerande avtalsytorna har inget status.",
        });
        return contractControl;
      }
    } else {
      Object.assign(contractControl, {
        contractOk: false,
        type: "Det finns redan en gällande avtalsyta. (Utan händelselöpnummer).",
      });
      return contractControl;
    }
  }

  /**Validates all existing features connected to the contract ID */
  validateContractCollection(featureCollection) {
    for (var i = 0; i < featureCollection.features.length; i++) {
      var existingContract = this.validateContract(
        featureCollection.features[i]
      );
      if (!existingContract.contractOk) {
        this.publishMessage(existingContract.message, "error", false);
        return false;
      }
    }
    this.publishMessage(existingContract.message, "warning", false);
    return true;
  }

  lookupEstate(source, feature, callback) {
    const projCode = this.map.getView().getProjection().getCode();

    const geometry = feature.getGeometry();

    const options = {
      featureTypes: source.layers,
      srsName: projCode,
      outputFormat: "JSON", //source.outputFormat,
      geometryName: source.geometryField,
      filter: new Intersects(source.geometryField, geometry, projCode),
    };

    const node = this.wfsParser.writeGetFeature(options);
    const xmlSerializer = new XMLSerializer();
    const xmlString = xmlSerializer.serializeToString(node);

    const request = {
      credentials: "same-origin",
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: xmlString,
    };

    return fetch(
      this.app.config.appConfig.searchProxy + source.url,
      request
    ).then((response) => {
      return response.json();
    });
  }

  checkForSelfIntersect = () => {
    return this.vectorSource.getFeatures().some((feature) => {
      if (
        feature.modification === "added" ||
        feature.modification === "updated"
      ) {
        let intersects = kinks(new GeoJSON().writeFeatureObject(feature));
        return intersects.features.length > 1;
      } else {
        return false;
      }
    });
  };

  getAreaAndAffectedEstates(callback) {
    let affectedEstates = [];
    let totalArea = 0;
    let promises = [];
    let createdFeatures = [];
    const estateSource = this.options.sources.find(
      (source) => source.layers[0] === this.options.estateSource
    );

    if (this.checkForSelfIntersect()) {
      callback({ error: "Geometries are self-intersecting" });
    } else {
      this.vectorSource.getFeatures().forEach((feature) => {
        if (
          feature.modification === "added" ||
          feature.modification === "updated"
        ) {
          createdFeatures.push(feature);
          let geom = feature.getGeometry();
          if (geom.getType() === GeometryType.POLYGON) {
            totalArea += Math.floor(geom.getArea());
          }
          promises.push(this.lookupEstate(estateSource, feature));
        }
      });

      let collectionOk = true;
      Promise.all(promises).then((estateCollections) => {
        if (estateCollections) {
          estateCollections.forEach((estateCollection) => {
            estateCollection.features.forEach((estate) => {
              var parser = new GeoJSON();
              let estateArea = Math.round(
                parser.readFeature(estate).getGeometry().getArea()
              );
              let affectedArea = 0;
              createdFeatures.forEach((drawnArea) => {
                if (
                  drawnArea.getGeometry().getType() === GeometryType.POLYGON
                ) {
                  try {
                    let interSection = intersect(
                      parser.writeFeatureObject(drawnArea),
                      estate
                    );
                    if (interSection) {
                      let intersectionFeature =
                        parser.readFeature(interSection);
                      if (
                        intersectionFeature.getGeometry().getType() ===
                          GeometryType.POLYGON ||
                        GeometryType.MULTI_POLYGON
                      ) {
                        try {
                          let tempArea = intersectionFeature
                            .getGeometry()
                            .getArea();
                          if (tempArea > 1) {
                            affectedArea += Math.floor(tempArea);
                          }
                        } catch (error) {
                          console.warn(error);
                        }
                      }
                    }
                  } catch (error) {
                    console.warn("error: ", error);
                    collectionOk = false;
                  }
                }
              });
              if (affectedArea > 0) {
                let objIndex = affectedEstates.findIndex(
                  (obj) => obj.estateName === estate.properties.fastighet
                );
                if (objIndex === -1) {
                  affectedEstates.push({
                    estateName: estate.properties.fastighet,
                    estateId: estate.properties.fastnr_fk || "",
                    estateArea: estateArea,
                    affectedArea: affectedArea,
                  });
                }
              }
            });
          });
          let result = {
            operation: this.markisParameters.type,
            objectId: this.markisParameters.objectId || "",
            objectSerial: this.markisParameters.objectSerial || "",
            totalArea: totalArea,
            affectedEstates: affectedEstates,
          };
          if (collectionOk) {
            callback(result);
          } else {
            callback({
              error: "Geometries are self-intersecting",
            });
          }
        }
      });
    }
  }

  invokeCompleteMessage(done) {
    this.getAreaAndAffectedEstates((r) => {
      if (!r.error) {
        let message_string = JSON.stringify(r);
        this.connection.invoke(
          "OperationCompleted",
          this.sessionId,
          message_string
        );
        return done({ success: "Area calculated without issues." });
      }
      return done({ error: "Area could not be calculated correctly." });
    });
  }

  connectToHub(sessionId) {
    this.sessionId = sessionId;
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.options.hubUrl + "?sid=" + sessionId + "")
      .build();

    this.connection
      .start()
      .then(
        function () {
          this.isConnected = true;
        }.bind(this)
      )
      .catch(
        function () {
          this.publishMessage(
            "Webbkartan kunde inte ansluta till MarkIS.",
            "error",
            false
          );
        }.bind(this)
      );

    this.connection.on(
      "Map.ShowContract",
      function (_, showMessage) {
        this.reset();
        Object.assign(this.markisParameters, {
          userMode: "Show",
          type: "Contract",
        });
        const showObj = JSON.parse(showMessage);
        const validationResult = validateMessageParameters(
          this.markisParameters,
          showObj
        );
        if (validationResult[0]) {
          this.assignMessageParameters(showObj);
          this.localObserver.publish("show-existing-contract", {});
          this.doSearch(showObj.objectId, undefined);
        } else {
          this.publishMessage(validationResult[1], "error", true);
        }
      }.bind(this)
    );

    this.connection.on(
      "Map.ShowEstateGeometry",
      function (_, message) {
        this.reset();
        Object.assign(this.markisParameters, {
          userMode: "Show",
          type: "Estate",
        });
        const showEstateObj = JSON.parse(message);
        const validationResult = validateMessageParameters(
          this.markisParameters,
          showEstateObj
        );
        if (validationResult[0]) {
          this.assignMessageParameters(showEstateObj);
          const estateSource = this.options.sources.find(
            (source) => source.layers[0] === this.options.estateSource
          );
          this.localObserver.publish("show-existing-contract", {});
          this.doSearch(showEstateObj.objectId, estateSource);
          this.toggleLayerById([this.options.estateLayerId], true);
        } else {
          this.publishMessage(validationResult[1], "error", true);
        }
      }.bind(this)
    );

    this.connection.on(
      "Map.ShowLongLeaseGeometry",
      function (_, message) {
        this.reset();
        Object.assign(this.markisParameters, {
          userMode: "Show",
          type: "LongLease",
        });
        const showLongLeaseObj = JSON.parse(message);
        const validationResult = validateMessageParameters(
          this.markisParameters,
          showLongLeaseObj
        );
        if (validationResult[0]) {
          this.assignMessageParameters(showLongLeaseObj);
          const longLeaseSource = this.options.sources.find(
            (source) =>
              source.layers[0] === this.options.layerNames["longLeaseLayerName"]
          );

          this.localObserver.publish("show-existing-contract", {});
          this.doSearch(showLongLeaseObj.objectId, longLeaseSource);
          this.toggleLayerById([this.options.longLeaseLayerId], true);
        } else {
          this.publishMessage(validationResult[1], "error", true);
        }
      }.bind(this)
    );

    this.connection.on(
      "Map.CreatePurchaseGeometry",
      function (_, message) {
        this.reset();
        Object.assign(this.markisParameters, {
          userMode: "Create",
          type: "Purchase",
        });
        const createPurchaseObj = JSON.parse(message);
        const validationResult = validateMessageParameters(
          this.markisParameters,
          createPurchaseObj
        );
        if (validationResult[0]) {
          this.assignMessageParameters(createPurchaseObj);
          this.sourceName = this.options.layerNames["purchaseLayerName"];
          this.setEditLayer(this.sourceName);
          this.searchResultLayer.getSource().clear();
          this.localObserver.publish("create-contract", {});
          this.toggleLayerById(this.editSource.activeLayers, true);
        } else {
          this.publishMessage(validationResult[1], "error", true);
        }
      }.bind(this)
    );

    this.connection.on(
      "Map.CreateSaleGeometry",
      function (_, message) {
        this.reset();
        Object.assign(this.markisParameters, {
          userMode: "Create",
          type: "Sale",
        });
        const createSaleObj = JSON.parse(message);
        const validationResult = validateMessageParameters(
          this.markisParameters,
          createSaleObj
        );
        if (validationResult[0]) {
          this.assignMessageParameters(createSaleObj);
          this.sourceName = this.options.layerNames["saleLayerName"];
          this.setEditLayer(this.sourceName);
          this.searchResultLayer.getSource().clear();
          this.localObserver.publish("create-contract", {});
          this.toggleLayerById(this.editSource.activeLayers, true);
        } else {
          this.publishMessage(validationResult[1], "error", true);
        }
      }.bind(this)
    );

    this.connection.on(
      "Map.CreateContract",
      function (_, createMessage) {
        this.reset();
        Object.assign(this.markisParameters, {
          userMode: "Create",
          type: "Contract",
        });
        const createContractObject = JSON.parse(createMessage);
        const validationResult = validateMessageParameters(
          this.markisParameters,
          createContractObject
        );
        if (validationResult[0]) {
          this.assignMessageParameters(createContractObject);
          this.search(this.markisParameters.objectId, undefined, (result) => {
            let numExistingContracts = this.getNumberOfResults(result);
            if (numExistingContracts > 0) {
              var contractCollectionOk = this.validateContractCollection(
                result[0]
              );
              if (contractCollectionOk) {
                this.enableContractCreation(createContractObject, result);
                this.localObserver.publish("create-contract", {});
              } else {
                this.highlightImpact(result);
                Object.assign(this.markisParameters, {
                  userMode: "Show",
                  type: "Contract",
                });
                this.localObserver.publish("show-existing-contract", {});
              }
            } else {
              this.enableContractCreation(createContractObject, null);
              this.localObserver.publish("create-contract", {});
            }
          });
        } else {
          this.publishMessage(validationResult[1], "error", true);
        }
      }.bind(this)
    );
  }

  //Get and add features connected to the correct contract. If we are creating a new "tilläggsavtal", features
  //from the old contract can be added to the editing area. If we are editing a "tilläggsavtal", features
  //from the old contract should not be added.
  addExistingFeatures(existingGeom) {
    let featuresToAdd = undefined;
    const existingFeatures = new GeoJSON({
      geometryName: this.geometryName,
    }).readFeatures(existingGeom[0]);

    const allFromSame = existingFeatures.every(
      (feature) =>
        feature.getProperties().handlopnr ===
        existingFeatures[0].getProperties().handlopnr
    );

    if (!allFromSame) {
      featuresToAdd = existingFeatures.filter(
        (feature) =>
          feature.getProperties().handlopnr.toString() ===
          this.markisParameters.objectSerial
      );
    } else {
      featuresToAdd = existingFeatures;
    }

    if (featuresToAdd) {
      this.vectorSource.addFeatures(featuresToAdd);
    }
  }

  getLayersByIds = (layerIds) => {
    return this.map
      .getLayers()
      .getArray()
      .filter((layer) => {
        return layerIds.indexOf(layer.values_.name) > -1;
      });
  };

  toggleLayerById = (layerIds, visible) => {
    let layers = this.getLayersByIds(layerIds);
    if (layers && layers.length > 0) {
      layers.forEach((layer) => {
        layer.setProperties({ visible: visible });
      });
    }
  };

  /**Enables creation of contract geometries. Sets the editlayer etc. */
  enableContractCreation(createObject, existingGeom) {
    this.searchResultLayer.getSource().clear();
    this.sourceName = this.getContractSource();
    if (this.sourceName) {
      this.setEditLayer(this.sourceName);
      this.toggleLayerById(this.editSource.activeLayers, true);
      if (existingGeom) {
        this.geometriesExist = true;
        this.editingExisting = true;
        this.localObserver.publish("editing-existing-contract");
        this.addExistingFeatures(existingGeom);
        this.vectorSource.getFeatures().forEach((feature) => {
          feature.setId(this.featureIdCounter);
          this.featureIdCounter++;
          //If we are creating "Tilläggsavtal", all existing geometries are seen as "new" geometries (Added).
          if (feature.getProperties().status.toUpperCase() === "G") {
            feature.modification = "added";
            feature.unset("id", true);
          } else {
            feature.modification = "updated";
          }
          feature.on("propertychange", (e) => {
            if (feature.modification === "removed") {
              return;
            }
            if (feature.modification === "added") {
              return;
            }
            if (feature.getProperties().id) {
              feature.modification = "updated";
            }
          });
          feature.on("change", (e) => {
            if (feature.modification === "removed") {
              return;
            }
            if (feature.modification === "added") {
              return;
            }
            if (feature.getProperties().id) {
              feature.modification = "updated";
            }
          });
        });
        const extent = this.vectorSource.getExtent();
        this.map.getView().fit(extent, this.map.getSize());
      }
    } else {
      this.publishMessage(
        "Inget datalager hittades för avtalsprefixet. Kontakta systemadministratören.",
        "error",
        true
      );
    }
  }

  publishMessage(message, variant, reset) {
    this.localObserver.publish("markisMessageEvent", {
      message: message,
      variant: variant,
      reset: reset,
    });
  }

  disconnectHub() {
    this.connection
      .stop()
      .then(
        function () {
          this.isConnected = false;
        }.bind(this)
      )
      .catch(function () {
        console.log("Disconnection from hub failed");
      });
  }

  lookUp(source, searchInput) {
    const projCode = this.map.getView().getProjection().getCode();

    var isLikeFilters = source.searchFields.map((searchField) => {
      return new IsLike(
        searchField,
        searchInput,
        "*", // wild card
        ".", // single char
        "!", // escape char
        false // match case
      );
    });

    var filter =
      isLikeFilters.length > 1 ? new Or(...isLikeFilters) : isLikeFilters[0];

    const options = {
      featureTypes: source.layers,
      srsName: projCode,
      outputFormat: "JSON", //source.outputFormat,
      geometryName: source.geometryField,
      maxFeatures: 100,
      filter: filter,
    };

    const node = this.wfsParser.writeGetFeature(options);
    const xmlSerializer = new XMLSerializer();
    const xmlString = xmlSerializer.serializeToString(node);
    const controller = new AbortController();
    const signal = controller.signal;

    const request = {
      credentials: "same-origin",
      signal: signal,
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
      },
      body: xmlString,
    };
    const promise = fetch(
      this.app.config.appConfig.searchProxy + source.url,
      request
    );

    return { promise, controller };
  }

  search(searchInput, source, callback) {
    this.timeout = setTimeout(() => {
      this.searchResultLayer.getSource().clear();
      let promises = [];
      this.controllers.splice(0, this.controllers.length);

      if (source) {
        const { promise, controller } = this.lookUp(source, searchInput);
        promises.push(promise);
        this.controllers.push(controller);
      } else {
        this.options.sources.forEach((source) => {
          const { promise, controller } = this.lookUp(source, searchInput);
          promises.push(promise);
          this.controllers.push(controller);
        });
      }
      Promise.all(promises)
        .then((responses) => {
          Promise.all(responses.map((result) => result.json()))
            .then((jsonResults) => {
              jsonResults.forEach((jsonResult, i) => {
                if (jsonResult.features.length > 0) {
                  arraySort({
                    array: jsonResult.features,
                    index: this.options.sources[i].searchFields[0],
                  });
                }
                jsonResult.source = this.options.sources[i];
              });
              jsonResults = jsonResults.filter(function (e) {
                return e.features.length > 0;
              });
              setTimeout(() => {
                return this.localObserver.publish("searchComplete");
              }, 500);
              if (callback) callback(jsonResults);
            })
            .catch((parseErrors) => {});
        })
        .catch((responseErrors) => {});
    }, 200);
  }

  doSearch(v, source) {
    if (v.length <= 3) return null;
    this.search(v, source, (d) => {
      const numHits = this.getNumberOfResults(d);
      if (numHits < 1) {
        this.publishMessage(
          `${v} returnerade inga ${this.options.displayConnections[
            this.markisParameters.type
          ].toLowerCase()}.`,
          "error",
          true
        );
        this.highlightImpact(d);
      } else {
        this.highlightImpact(d);
        this.publishMessage(
          `${
            this.options.displayConnections[this.markisParameters.type]
          } kopplade till ${v} är markerade i rött.`,
          "success",
          false
        );
      }
    });
  }

  getNumberOfResults = (result) => {
    return result.reduce((accumulated, result) => {
      return accumulated + result.features.length;
    }, 0);
  };

  highlightImpact(result) {
    const olFeatures = new GeoJSON().readFeatures(result[0]);
    this.searchResultLayer.getSource().addFeatures(olFeatures);
    const extent = this.searchResultLayer.getSource().getExtent();
    this.map.getView().fit(extent, this.map.getSize());
    this.searchResultLayer.setVisible(true);
  }
}

export default MarkisConnectionModel;
