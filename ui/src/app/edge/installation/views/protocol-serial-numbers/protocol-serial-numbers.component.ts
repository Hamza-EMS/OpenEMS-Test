import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { JsonrpcResponseSuccess } from 'src/app/shared/jsonrpc/base';
import { SetupProtocol, SubmitSetupProtocolRequest } from 'src/app/shared/jsonrpc/request/submitSetupProtocolRequest';
import { ChannelAddress, Service, Websocket } from 'src/app/shared/shared';
import { InstallationData } from '../../installation.component';
import { FeedInSetting } from '../protocol-dynamic-feed-in-limitation/protocol-dynamic-feed-in-limitation.component';

@Component({
  selector: ProtocolSerialNumbersComponent.SELECTOR,
  templateUrl: './protocol-serial-numbers.component.html'
})
export class ProtocolSerialNumbersComponent implements OnInit {
  private static readonly SELECTOR = "protocol-serial-numbers";

  @Input() public installationData: InstallationData;

  @Output() public previousViewEvent: EventEmitter<any> = new EventEmitter();
  @Output() public nextViewEvent = new EventEmitter<InstallationData>();

  public formSettings: FormGroup;
  public formTower1: FormGroup;
  public formTower2: FormGroup;
  public formTower3: FormGroup;

  public fieldsSettings: FormlyFieldConfig[];
  public fieldsTower1: FormlyFieldConfig[];
  public fieldsTower2: FormlyFieldConfig[];
  public fieldsTower3: FormlyFieldConfig[];

  public modelSettings;
  public modelTower1;
  public modelTower2;
  public modelTower3;

  public numberOfTowers: number;
  public numberOfModulesPerTower: number;

  public spinnerId: string;

  public isWaiting: boolean = false;

  constructor(private service: Service, private websocket: Websocket) { }

  public ngOnInit() {
    // Start spinner
    this.spinnerId = "installation-serial-number-spinner";
    this.service.startSpinner(this.spinnerId);

    // Subscribe to channels of battery inverter
    this.subscribeToChannels();

    // Subject to stop the subscription to currentData
    let stopOnRequest: Subject<void> = new Subject<void>();

    // Read data from battery inverter
    this.installationData.edge.currentData.pipe(
      takeUntil(stopOnRequest),
      filter(currentData => currentData != null)
    ).subscribe((currentData) => {
      let numberOfTowers = currentData.channel["battery0/NumberOfTowers"];
      let numberOfModulesPerTower = currentData.channel["battery0/NumberOfModulesPerTower"];
      let batteryInverterSerialNumber = currentData.channel["batteryInverter0/SerialNumber"];

      // Make sure values are available
      if (!numberOfTowers || !numberOfModulesPerTower || !batteryInverterSerialNumber) {
        return;
      }

      // Apply values and initialize fields
      this.numberOfTowers = parseInt(numberOfTowers);
      this.numberOfModulesPerTower = parseInt(numberOfModulesPerTower);
      this.modelTower1 = {
        batteryInverter: batteryInverterSerialNumber
      };

      this.initFields();

      // Unsubscribe
      stopOnRequest.next();
      stopOnRequest.complete();
      this.unsubscribeToChannels();
    });

    // If data isn't available after the timeout, the
    // fields get initialized with default values
    setTimeout(() => {
      this.numberOfTowers ??= 1;
      this.numberOfModulesPerTower ??= 5;

      this.initFields();

      // Unsubscribe
      stopOnRequest.next();
      stopOnRequest.complete();
      this.unsubscribeToChannels();
    }, 5000);
  }

  public onPreviousClicked() {
    this.previousViewEvent.emit();
  }

  public onNextClicked() {
    if (
      this.formSettings.invalid ||
      this.formTower1.invalid ||
      this.formTower2.invalid ||
      this.formTower3.invalid
    ) {
      return;
    }

    // Initialize serial numbers object
    this.installationData.battery.serialNumbers = {
      tower1: [],
      tower2: [],
      tower3: []
    };

    // Fill data from field into the installationData object
    let serialNumbers = this.installationData.battery.serialNumbers;

    for (let field of this.fieldsTower1) {
      serialNumbers.tower1.push({
        label: field.templateOptions.label,
        value: field.formControl.value
      })
    }

    if (this.numberOfTowers >= 2) {
      for (let field of this.fieldsTower2) {
        serialNumbers.tower2.push({
          label: field.templateOptions.label,
          value: field.formControl.value
        })
      }
    }

    if (this.numberOfTowers === 3) {
      for (let field of this.fieldsTower3) {
        serialNumbers.tower3.push({
          label: field.templateOptions.label,
          value: field.formControl.value
        })
      }
    }

    // Submit the setup protocol
    this.isWaiting = true;

    this.submitSetupProtocol().then((protocolId) => {
      this.service.toast("Das Protokoll wurde erfolgreich versendet.", "success");
      this.installationData.setupProtocolId = protocolId;
    }).catch((reason) => {
      this.service.toast("Fehler beim Versenden des Protokolls.", "danger");
      console.log(reason);
    }).finally(() => {
      this.isWaiting = false;
      this.nextViewEvent.emit(this.installationData);
    });
  }

  public getSettingsFields(): FormlyFieldConfig[] {
    let fields: FormlyFieldConfig[] = [];

    fields.push({
      key: "numberOfTowers",
      type: "input",
      templateOptions: {
        type: "number",
        label: "Anzahl Türme",
        min: 1,
        max: 3,
        required: true
      },
      parsers: [Number],
      defaultValue: this.numberOfTowers
    });

    fields.push({
      key: "numberOfModulesPerTower",
      type: "input",
      templateOptions: {
        type: "number",
        label: "Anzahl Module pro Turm",
        min: 4,
        max: 10,
        required: true
      },
      parsers: [Number],
      defaultValue: this.numberOfModulesPerTower
    });

    return fields;
  }

  /**
   * Generates the fields for the specific tower number (1 - 3).
   * 
   * @param towerNr 
   * @returns an array with the generated fields
   */
  public getFields(towerNr: number): FormlyFieldConfig[] {
    // TODO add validation: no duplicate serial number entries
    let fields: FormlyFieldConfig[] = [];

    switch (towerNr) {
      case 1:
        fields.push({
          key: "batteryInverter",
          type: "input",
          templateOptions: {
            label: "Home - Wechselrichter",
            required: true
          }
        });
        fields.push({
          key: "emsBox",
          type: "input",
          templateOptions: {
            label: "Home - EMS Box",
            required: true
          },
          validators: {
            validation: ["serialNumber"]
          }
        });
        break;
      case 2:
        fields.push({
          key: "parallelBox",
          type: "input",
          templateOptions: {
            label: "Home - Parallel Box",
            required: true
          },
          validators: {
            validation: ["serialNumber"]
          }
        });
        break;
      case 3:
        fields.push({
          key: "extensionBox",
          type: "input",
          templateOptions: {
            label: "Home - Extension Box",
            required: true
          },
          validators: {
            validation: ["serialNumber"]
          }
        });
        break;
    }

    fields.push({
      key: "bmsBox",
      type: "input",
      templateOptions: {
        label: "Home - BMS Box & Sockel",
        required: true
      },
      defaultValue: 519100001009,
      validators: {
        validation: ["serialNumber"]
      }
    });

    for (let moduleNr = 1; moduleNr <= this.numberOfModulesPerTower; moduleNr++) {
      fields.push({
        key: "module" + moduleNr,
        type: "input",
        templateOptions: {
          label: "Home - Batteriemodul " + moduleNr,
          required: true
        },
        defaultValue: 519110001210,
        validators: {
          validation: ["serialNumber"]
        }
      });
    }

    return fields;
  }

  public initFields() {
    this.service.stopSpinner(this.spinnerId);

    this.formSettings = new FormGroup({});
    this.fieldsSettings = this.getSettingsFields();

    this.formTower1 = new FormGroup({});
    this.fieldsTower1 = this.getFields(1);

    this.formTower2 = new FormGroup({});
    this.fieldsTower2 = this.getFields(2);

    this.formTower3 = new FormGroup({});
    this.fieldsTower3 = this.getFields(3);
  }

  public onSettingsFieldsChange(event) {
    if (this.formSettings.invalid) {
      return;
    }

    this.numberOfTowers = event.numberOfTowers;
    this.numberOfModulesPerTower = event.numberOfModulesPerTower;

    this.initFields();
  }

  public subscribeToChannels() {
    this.installationData.edge.subscribeChannels(this.websocket, ProtocolSerialNumbersComponent.SELECTOR, [
      new ChannelAddress("battery0", "NumberOfTowers"),
      new ChannelAddress("battery0", "NumberOfModulesPerTower"),
      new ChannelAddress("batteryInverter0", "SerialNumber")
    ]);
  }

  public unsubscribeToChannels() {
    this.installationData.edge.unsubscribeChannels(this.websocket, ProtocolSerialNumbersComponent.SELECTOR);
  }

  /**
   * Submits the setup protocol to the backend.
   * 
   * @returns a promise promising a string that contains the protocol id
   */
  public submitSetupProtocol(): Promise<string> {
    //#region Variables

    let installationData = this.installationData;

    let customer = installationData.customer;
    let battery = installationData.battery;
    let batteryInverter = installationData.batteryInverter;
    let pv = installationData.pv;

    let emergencyReserve = battery.emergencyReserve;
    let lineSideMeterFuse = installationData.lineSideMeterFuse;
    let dynamicFeedInLimitation = batteryInverter.dynamicFeedInLimitation;
    let serialNumbers = battery.serialNumbers;
    let dc1 = pv.dc1;
    let dc2 = pv.dc2;
    let ac = pv.ac;

    //#endregion

    //#region Addresses & General

    let customerObj: any = {
      firstname: customer.firstName,
      lastname: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: {
        street: customer.street,
        city: customer.city,
        zip: customer.zip,
        country: customer.country
      }
    }

    if (customer.isCorporateClient) {
      customerObj.company = {
        name: customer.companyName
      }
    }

    let protocol: SetupProtocol = {
      fems: {
        id: this.installationData.edge.id
      },
      customer: customerObj
    };

    // If location data is different to customer data, the location
    // data gets sent too
    if (!this.installationData.location.isEqualToCustomerData) {
      let location = this.installationData.location;

      protocol.location = {
        firstname: location.firstName,
        lastname: location.lastName,
        email: location.email,
        phone: location.phone,
        address: {
          street: location.street,
          city: location.city,
          zip: location.zip,
          country: location.country
        },
        company: {
          name: location.companyName
        }
      }
    }

    //#endregion

    //#region Items

    protocol.items = [];

    //#region Emergency Reserve

    protocol.items.push({
      category: "Angaben zu Notstrom",
      name: "Notstrom?",
      value: emergencyReserve.isEnabled ? "ja" : "nein"
    });

    if (emergencyReserve.isEnabled) {
      protocol.items.push({
        category: "Angaben zu Notstrom",
        name: "Notstromreserve [%]",
        value: emergencyReserve.value.toString()
      });
    }

    //#endregion

    //#region Line Side Meter Fuse

    let lineSideMeterFuseValue: number;

    if (lineSideMeterFuse.fixedValue === -1) {
      lineSideMeterFuseValue = lineSideMeterFuse.otherValue;
    } else {
      lineSideMeterFuseValue = lineSideMeterFuse.fixedValue;
    }

    protocol.items.push({
      category: "Zählervorsicherung",
      name: "Wert [A]",
      value: lineSideMeterFuseValue.toString()
    });

    //#endregion

    //#region DC-PV

    // DC-PV 1
    if (dc1.isSelected) {

      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Alias MPPT1",
        value: dc1.alias
      });

      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Wert MPPT1 [Wp]",
        value: dc1.value.toString()
      });

      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Ausrichtung MPPT1",
        value: dc1.orientation
      });

      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Modultyp MPPT1",
        value: dc1.moduleType
      });

      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Modulanzahl MPPT1",
        value: dc1.modulesPerString != undefined ? dc1.modulesPerString.toString() : ""
      });
    }

    // DC-PV 2
    if (dc2.isSelected) {
      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Wert MPPT2 [Wp]",
        value: dc2.value ? dc2.value.toString() : ""
      });

      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Alias MPPT2",
        value: dc2.alias
      });

      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Ausrichtung MPPT2",
        value: dc2.alias
      });

      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Modultyp MPPT2",
        value: dc2.moduleType
      });

      protocol.items.push({
        category: "DC-PV-Installation",
        name: "Modulanzahl MPPT2",
        value: dc2.modulesPerString != undefined ? dc2.modulesPerString.toString() : ""
      });
    }

    //#endregion

    //#region Dynamic Feed In Limitation

    protocol.items.push({
      category: "Dynamische Begrenzung der Einspeisung",
      name: "Maximale Einspeiseleistung [W]",
      value: dynamicFeedInLimitation.maximumFeedInPower != undefined ? dynamicFeedInLimitation.maximumFeedInPower.toString() : ""
    });

    protocol.items.push({
      category: "Dynamische Begrenzung der Einspeisung",
      name: "Typ",
      value: dynamicFeedInLimitation.feedInSetting
    });

    if (dynamicFeedInLimitation.feedInSetting === FeedInSetting.FixedPowerFactor) {
      protocol.items.push({
        category: "Dynamische Begrenzung der Einspeisung",
        name: "Cos φ Festwert",
        value: dynamicFeedInLimitation.fixedPowerFactor
      });
    }

    //#endregion

    //#region AC-PV

    for (let index = 0; index < ac.length; index++) {
      let element = ac[index];
      let label = "AC" + (index + 1);

      protocol.items.push({
        category: "Zusätzliche AC-Erzeuger",
        name: "Alias " + label,
        value: element.alias
      });

      protocol.items.push({
        category: "Zusätzliche AC-Erzeuger",
        name: "Wert " + label + " [Wp]",
        value: element.value.toString()
      });

      protocol.items.push({
        category: "Zusätzliche AC-Erzeuger",
        name: "Ausrichtung " + label,
        value: element.orientation
      });

      protocol.items.push({
        category: "Zusätzliche AC-Erzeuger",
        name: "Modultyp " + label,
        value: element.moduleType
      });

      protocol.items.push({
        category: "Zusätzliche AC-Erzeuger",
        name: "Modulanzahl " + label,
        value: element.modulesPerString != undefined ? element.modulesPerString.toString() : ""
      });

      protocol.items.push({
        category: "Zusätzliche AC-Erzeuger",
        name: "Zählertyp " + label,
        value: element.meterType
      });

      protocol.items.push({
        category: "Zusätzliche AC-Erzeuger",
        name: "Modbus Kommunikationsadresse " + label,
        value: element.modbusCommunicationAddress != undefined ? element.modbusCommunicationAddress.toString() : ""
      });
    }

    //#endregion

    //#region FEMS

    protocol.items.push({
      category: "FEMS",
      name: "FEMS Nummer",
      value: installationData.edge.id
    });

    //#endregion

    //#endregion

    //#region Serial Numbers

    protocol.lots = [];

    // Speichersystemkomponenten
    for (let serialNumber of serialNumbers.tower1) {
      if (serialNumber.value !== null && serialNumber.value !== "") {
        protocol.lots.push({
          category: "Speichersystemkomponenten",
          name: serialNumber.label + " Seriennummer",
          serialNumber: serialNumber.value
        });
      }
    }

    // Batterieturm 2
    for (let serialNumber of serialNumbers.tower2) {
      if (serialNumber.value !== null && serialNumber.value !== "") {
        protocol.lots.push({
          category: "Batterieturm 2",
          name: serialNumber.label + " Seriennummer",
          serialNumber: serialNumber.value
        });
      }
    }

    // Batterieturm 3
    for (let serialNumber of serialNumbers.tower3) {
      if (serialNumber.value !== null && serialNumber.value !== "") {
        protocol.lots.push({
          category: "Batterieturm 3",
          name: serialNumber.label + " Seriennummer",
          serialNumber: serialNumber.value
        });
      }
    }

    //#endregion

    //#region Send Request

    return new Promise((resolve, reject) => {
      this.websocket.sendRequest(new SubmitSetupProtocolRequest({ protocol: protocol })).then((response: JsonrpcResponseSuccess) => {
        resolve(response.result["setupProtocolId"]);
      }).catch((reason) => {
        reject(reason);
      });
    });

    //#endregion
  }
}