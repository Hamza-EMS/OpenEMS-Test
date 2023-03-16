package io.openems.backend.timedata.aggregatedinflux;

import java.util.Map;
import java.util.Map.Entry;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import com.google.common.collect.ImmutableMap;
import com.google.gson.JsonElement;
import com.influxdb.client.write.Point;

public final class AllowedChannels {

	public static final Map<String, DataType> ALLOWED_AVERAGE_CHANNELS;
	public static final Map<String, DataType> ALLOWED_CUMULATED_CHANNELS;

	private AllowedChannels() {
	}

	static {
		ALLOWED_AVERAGE_CHANNELS = ImmutableMap.<String, DataType>builder() //
				.put("_sum/EssSoc", DataType.LONG) //
				.put("_sum/EssActivePower", DataType.LONG) //
				.put("_sum/EssActivePowerL1", DataType.LONG) //
				.put("_sum/EssActivePowerL2", DataType.LONG) //
				.put("_sum/EssActivePowerL3", DataType.LONG) //
				.put("_sum/GridActivePower", DataType.LONG) //
				.put("_sum/GridActivePowerL1", DataType.LONG) //
				.put("_sum/GridActivePowerL2", DataType.LONG) //
				.put("_sum/GridActivePowerL3", DataType.LONG) //
				.put("_sum/ProductionActivePower", DataType.LONG) //
				.put("_sum/ProductionAcActivePower", DataType.LONG) //
				.put("_sum/ProductionAcActivePowerL1", DataType.LONG) //
				.put("_sum/ProductionAcActivePowerL2", DataType.LONG) //
				.put("_sum/ProductionAcActivePowerL3", DataType.LONG) //
				.put("_sum/ProductionDcActualPower", DataType.LONG) //
				.put("_sum/ConsumptionActivePower", DataType.LONG) //
				.put("_sum/ConsumptionActivePowerL1", DataType.LONG) //
				.put("_sum/ConsumptionActivePowerL2", DataType.LONG) //
				.put("_sum/ConsumptionActivePowerL3", DataType.LONG) //
				.putAll(multiChannels("io", 0, 5, "Relay", 1, 9, DataType.LONG)) //
				.put("ctrlIoHeatPump0/RegularStateTime", DataType.LONG) //
				.put("ctrlIoHeatPump0/RecommendationStateTime", DataType.LONG) //
				.put("ctrlIoHeatPump0/ForceOnStateTime", DataType.LONG) //
				.put("ctrlIoHeatPump0/LockStateTime", DataType.LONG) //
				.put("ess0/Soc", DataType.LONG) //
				.put("ess0/ActivePower", DataType.LONG) //
				.build();

		ALLOWED_CUMULATED_CHANNELS = ImmutableMap.<String, DataType>builder() //
				.put("_sum/EssDcChargeEnergy", DataType.LONG) //
				.put("_sum/EssDcDischargeEnergy", DataType.LONG) //
				.put("_sum/GridSellActiveEnergy", DataType.LONG) //
				.put("_sum/ProductionActiveEnergy", DataType.LONG) //
				.put("_sum/ConsumptionActiveEnergy", DataType.LONG) //
				.put("_sum/GridBuyActiveEnergy", DataType.LONG) //
				.put("_sum/EssActiveChargeEnergy", DataType.LONG) //
				.put("_sum/EssActiveDischargeEnergy", DataType.LONG) //
				.put("ctrlEssTimeOfUseTariffDischarge0/DelayedTime", DataType.LONG) //
				.putAll(multiChannels("evcs", 0, 3, "ActiveConsumptionEnergy", DataType.LONG)) //
				.putAll(multiChannels("meter", 0, 3, "ActiveProductionEnergy", DataType.LONG)) //
				.putAll(multiChannels("io", 0, 9, "ActiveProductionEnergy", DataType.LONG)) //
				.putAll(multiChannels("pvInverter", 0, 5, "ActiveProductionEnergy", DataType.LONG)) //
				.putAll(multiChannels("charger", 0, 5, "ActualEnergy", DataType.LONG)) //
				.put("ctrlGridOptimizedCharge0/AvoidLowChargingTime", DataType.LONG) //
				.put("ctrlGridOptimizedCharge0/NoLimitationTime", DataType.LONG) //
				.put("ctrlGridOptimizedCharge0/SellToGridLimitTime", DataType.LONG) //
				.put("ctrlGridOptimizedCharge0/DelayChargeTime", DataType.LONG) //
				.build();
	}

	public static enum ChannelType {
		AVG, //
		MAX, //
		UNDEFINED, //
		;
	}

	/**
	 * TODO add Javadoc.
	 * 
	 * @param channel the Channel-Address
	 * @return the {@link ChannelType}
	 */
	public static ChannelType getChannelType(String channel) {
		if (ALLOWED_AVERAGE_CHANNELS.containsKey(channel)) {
			return ChannelType.AVG;
		}
		if (ALLOWED_CUMULATED_CHANNELS.containsKey(channel)) {
			return ChannelType.MAX;
		}
		return ChannelType.UNDEFINED;
	}

	/**
	 * Adds the given value to the builder at the specified field parsed to the
	 * predefined type of the channel.
	 * 
	 * @param builder a {@link Point} builder
	 * @param field   the field name
	 * @param value   the {@link JsonElement} value
	 * @return true on success
	 */
	public static boolean addWithSpecificChannelType(Point builder, String field, JsonElement value) {
		if (value == null) {
			return false;
		}
		if (!value.isJsonPrimitive()) {
			return false;
		}
		if (!value.getAsJsonPrimitive().isNumber()) {
			return false;
		}
		final var type = typeOf(field);
		if (type == null) {
			return false;
		}
		final var number = value.getAsNumber();
		switch (type) {
		case DOUBLE:
			builder.addField(field, number.doubleValue());
			return true;
		case LONG:
			builder.addField(field, number.longValue());
			return true;
		}
		return false;
	}

	protected static enum DataType {
		LONG, //
		DOUBLE, //
		;
	}

	private static DataType typeOf(String channel) {
		var type = ALLOWED_AVERAGE_CHANNELS.get(channel);
		if (type != null) {
			return type;
		}
		type = ALLOWED_CUMULATED_CHANNELS.get(channel);
		if (type != null) {
			return type;
		}
		return null;
	}

	protected static Iterable<Entry<String, DataType>> multiChannels(//
			final String component, //
			final int from, //
			final int to, //
			final String channelOfComponent, //
			final DataType type //
	) {
		return IntStream.range(from, to) //
				.mapToObj(componentNumber -> {
					return component + componentNumber + "/" + channelOfComponent;
				}).collect(Collectors.toMap(t -> t, t -> type)).entrySet();
	}

	protected static Iterable<Entry<String, DataType>> multiChannels(//
			final String component, //
			final int from, //
			final int to, //
			final String channelOfComponent, //
			final int fromChannel, //
			final int toChannel, //
			final DataType type //
	) {
		return IntStream.range(from, to) //
				.mapToObj(componentNumber -> {
					return IntStream.range(fromChannel, toChannel) //
							.mapToObj(channelNumber -> {
								return component + componentNumber + "/" + channelOfComponent + channelNumber;
							});
				}).flatMap(t -> t).collect(Collectors.toMap(t -> t, t -> type)).entrySet();
	}

}
