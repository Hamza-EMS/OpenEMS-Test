package io.openems.edge.app.heat;

import java.util.EnumMap;
import java.util.List;

import org.osgi.service.component.ComponentContext;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Reference;

import com.google.common.collect.Lists;
import com.google.gson.JsonElement;

import io.openems.common.exceptions.OpenemsError.OpenemsNamedException;
import io.openems.common.exceptions.OpenemsException;
import io.openems.common.function.ThrowingBiFunction;
import io.openems.common.types.EdgeConfig;
import io.openems.common.types.EdgeConfig.Component;
import io.openems.common.utils.JsonUtils;
import io.openems.edge.app.heat.HeatPump.Property;
import io.openems.edge.common.component.ComponentManager;
import io.openems.edge.core.appmanager.AbstractOpenemsApp;
import io.openems.edge.core.appmanager.AppAssistant;
import io.openems.edge.core.appmanager.AppConfiguration;
import io.openems.edge.core.appmanager.ConfigurationTarget;
import io.openems.edge.core.appmanager.OpenemsApp;
import io.openems.edge.core.appmanager.OpenemsAppCardinality;
import io.openems.edge.core.appmanager.OpenemsAppCategory;
import io.openems.edge.core.appmanager.validator.CheckHome;
import io.openems.edge.core.appmanager.validator.CheckRelayCount;
import io.openems.edge.core.appmanager.validator.Checkable;

/**
 * Describes a App for a Heating Pump.
 *
 * <pre>
  {
    "appId":"App.Heat.HeatPump",
    "alias":"Heating Pump App",
    "instanceId": UUID,
    "image": base64,
    "properties":{
    	"CTRL_IO_HEAT_PUMP_ID": "ctrlIoHeatPump0"
    }
  }
 * </pre>
 */
@org.osgi.service.component.annotations.Component(name = "App.Heat.HeatPump")
public class HeatPump extends AbstractOpenemsApp<Property> implements OpenemsApp {

	public static enum Property {
		CTRL_IO_HEAT_PUMP_ID;
	}

	@Activate
	public HeatPump(@Reference ComponentManager componentManager, ComponentContext componentContext) {
		super(componentManager, componentContext);
	}

	@Override
	protected ThrowingBiFunction<ConfigurationTarget, EnumMap<Property, JsonElement>, AppConfiguration, OpenemsNamedException> appConfigurationFactory() {
		return (t, p) -> {
			final var ctrlIoHeatPump0 = this.getId(t, p, Property.CTRL_IO_HEAT_PUMP_ID, "ctrlIoHeatPump0");

			if (t.isDeleteOrTest()) {
				List<Component> comp = Lists.newArrayList(//
						new EdgeConfig.Component(ctrlIoHeatPump0, this.getName(), "Controller.Io.HeatPump.SgReady",
								JsonUtils.buildJsonObject() //
										.build()));
				return new AppConfiguration(comp);
			}

			var relays = this.componentUtil.getPreferredRelays(Lists.newArrayList(ctrlIoHeatPump0), new int[] { 2, 3 },
					new int[] { 2, 3 });
			if (relays == null) {
				throw new OpenemsException("Not enought relays available!");
			}
			var outputChannel1 = relays[0];
			var outputChannel2 = relays[1];

			List<Component> comp = Lists.newArrayList(//
					new EdgeConfig.Component(ctrlIoHeatPump0, this.getName(), "Controller.Io.HeatPump.SgReady",
							JsonUtils.buildJsonObject() //
									.addProperty("outputChannel1", outputChannel1) //
									.addProperty("outputChannel2", outputChannel2) //
									.build()));
			return new AppConfiguration(comp);
		};
	}

	@Override
	public AppAssistant getAppAssistant() {
		return AppAssistant.create(this.getName()) //
				.fields(JsonUtils.buildJsonArray() //
						.build()) //
				.build();
	}

	@Override
	public OpenemsAppCategory[] getCategorys() {
		return new OpenemsAppCategory[] { OpenemsAppCategory.HEAT };
	}

	@Override
	protected List<Checkable> getCompatibleCheckables() {
		return Lists.newArrayList(new CheckHome(this.componentManager));
	}

	@Override
	public String getImage() {
		return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAADF6SURBVHhe7Z0N/JXj/cevMpvI2NADiqgwYqK0lLbWPDXTyLPGsGpklk3GxsyEmCGbiDwmyoRSymNoK0rztFRC5qGMCNvyfP7n/e18z/929ju/37nP4/3r93nX/Tq/c879dO77uj739/u9vtd1BSGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghhBBCCCGEEEIIIYQQQgghak+zzKuoIf/6179S77//fli9enX46KOPwicff5L5RlSaVCoV1v3yumG99dYLG7bcMGzdYWvViQSjm1MDXn311dQbb7wRXn/99fD222+H//znP+HTTz8Nn332mVWgzz//PLOmqBbNmjUL6667bvjyl78cNtxww/C1r30ttG3TNrRr1y5sseUWqicJQTeiSiBSixYt4hWLysQJYfKK0rx5cxMrlnXWWcc+F9WB+8B197/93nBP1l9//fD1r389bLfddmHrrbcObdq00Y2pIbr4FeaFF15IPfPMM2HZsmXhv//9r1UCBIlXFvj444/NFfzwww/t708++SRbgURl4R585StfsYcGbiGvLODWLgIGWF7t27cPu+66a9hqq61Ud2qALnqFWLp0aWrevHlmUSFEVAqsJioI7t8777wTcAtfe+21sGLFivDee+/9fwxLglU1uCfcGxasqa9+9athiy22CFtuuWVo27atvecBw/1wy6tFixZhm222CbvvvjvrqQ5VEV3sCjBz5szUs88+a0JFTMQL/LvvvhtwCxcvXhxefvlls7gkTMkEIcMVxA3cYYcd7BXx4nPuGQ8W3nft2jX07t1b9ahK6EKXkZdeeik1a9assHz5civYX/rSl+yV908++WRYuHChWVbuYji+Lgvi5i6J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";
	}

	@Override
	protected List<Checkable> getInstallableCheckables() {
		return Lists.newArrayList(new CheckRelayCount(this.componentUtil, 2));
	}

	@Override
	public String getName() {
		return "\"SG-Ready\" W�rmepumpe";
	}

	@Override
	protected Class<Property> getPropertyClass() {
		return Property.class;
	}

	@Override
	public OpenemsAppCardinality getCardinality() {
		return OpenemsAppCardinality.SINGLE;
	}

}