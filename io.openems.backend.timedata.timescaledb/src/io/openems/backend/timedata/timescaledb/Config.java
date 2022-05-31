package io.openems.backend.timedata.timescaledb;

import org.osgi.service.metatype.annotations.AttributeDefinition;
import org.osgi.service.metatype.annotations.AttributeType;
import org.osgi.service.metatype.annotations.ObjectClassDefinition;

@ObjectClassDefinition(//
		name = "Timedata.TimescaleDB", //
		description = "Configures the TimescaleDB Timedata provider")
public @interface Config {

	@AttributeDefinition(name = "Host", description = "The TimescaleDB/PostgresDB host")
	String host() default "localhost";

	@AttributeDefinition(name = "Port", description = "The TimescaleDB/PostgresDB port")
	int port() default 5432;

	@AttributeDefinition(name = "Username", description = "The TimescaleDB/PostgresDB username")
	String user();

	@AttributeDefinition(name = "Password", description = "The TimescaleDB/PostgresDB password", type = AttributeType.PASSWORD)
	String password();

	@AttributeDefinition(name = "Database", description = "The TimescaleDB/PostgresDB database name")
	String database();

	String webconsole_configurationFactory_nameHint() default "Timedata.TimescaleDB";

}
