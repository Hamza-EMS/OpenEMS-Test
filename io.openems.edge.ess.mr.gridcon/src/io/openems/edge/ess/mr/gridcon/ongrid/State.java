package io.openems.edge.ess.mr.gridcon.ongrid;

import io.openems.common.types.OptionsEnum;
import io.openems.edge.ess.mr.gridcon.IState;

public enum State implements IState {
	UNDEFINED(-1, "Undefined"), //
	STOPPED(0, "Stopped"), //
	RUN(1, "Run"), //
	ERROR(3, "Error"), //
	;
	
	private final int value;
	private final String name;

	private State(int value, String name) {
		this.value = value;
		this.name = name;
	}

	@Override
	public int getValue() {
		return value;
	}

	@Override
	public String getName() {
		return name;
	}

	@Override
	public OptionsEnum getUndefined() {
		return UNDEFINED;
	}
}