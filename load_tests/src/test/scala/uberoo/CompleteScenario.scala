package uberoo

import scala.concurrent.duration._

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.jdbc.Predef._
import io.gatling.commons.validation._
import org.json4s._
import org.json4s.JsonDSL._
import org.json4s.jackson.JsonMethods._

class CompleteScenario extends Simulation {

    val CustomerUrl = "http://localhost:8097";
    val RestaurantUrl = "http://localhost:8098";
    val CoursierUrl = "http://localhost:8099";

	val httpConfig = http
		.acceptEncodingHeader("gzip, deflate")
		.header(HttpHeaderNames.ContentType, HttpHeaderValues.ApplicationJson)
 		.header(HttpHeaderNames.Accept, HttpHeaderValues.ApplicationJson)

	val coursierId = "18";

	val consultMeals = scenario("Consult meals")
		.exec(http("Get meals")
			.get(s"$CustomerUrl/meals"))
    
    val order = scenario("Order")
        .exec(http("Customer gets meals")
			.get(s"$CustomerUrl/meals")
			.queryParam("category", "burger")
			.queryParam("restaurant", "MacDo")
			.check(jsonPath("$.meals").saveAs("meals"))
			.check(jsonPath("$.meals[0].restaurant.id").saveAs("restaurantId")))
        .pause(1)
        .exec(http("Customer makes an order request")
			.post(s"$CustomerUrl/orders")
			.body(StringBody(session => compact(render(
				("meals" -> parse(session("meals").as[String])) ~ 
				("customer" -> 
					("name" -> "Bob") ~ 
					("address" -> "4 Privet Drive"))))))
			.check(jsonPath("$.orderId").saveAs("orderId")))
		.pause(1)
		.exec(http("Customer finalises his order")
			.put(s"$CustomerUrl/orders/" + "${orderId}")
			.body(StringBody(session => compact(render(
				("orderId" -> session("orderId").as[String]) ~ 
				("customer" -> 
					("name" -> "Bob") ~ 
					("address" -> "4 Privet Drive")) ~
				("meals" -> parse(session("meals").as[String])) ~
				("creditCard" ->
					("name" -> "Bob") ~
					("number" -> "551512348989") ~
					("ccv" -> "775") ~
					("limit" -> "07/19")))))))
		.pause(1)
		.exec(http("Cook lists his todo meals")
			.get(s"$RestaurantUrl/orders")
			.queryParam("id", "${restaurantId}")
			.queryParam("status", "todo"))
		.pause(1)
		.exec(http("Couriser lists nearby orders")
			.get(s"$CoursierUrl/deliveries")
			.queryParam("id", coursierId)
			.queryParam("address", "3 Rue principale"))
        .pause(1)
        .exec(http("Couriser assigns delivery")
			.post(s"$CoursierUrl/deliveries")
			.body(StringBody(session => compact(render(
				("coursierId" -> coursierId) ~ 
				("orderId" -> session("orderId").as[String]))))))
		.pause(1)
		.exec(http("Cook finished the meals")
			.put(s"$RestaurantUrl/orders/" + "${orderId}")
			.body(StringBody(session => compact(render(
				("orderId" -> session("orderId").as[String]))))))
		.pause(1)
		.repeat(5, "_") {
			exec(http("Coursier update is position")
				.put(s"$CoursierUrl/geolocation/")
				.body(StringBody(session => compact(render(
					("orderId" -> session("orderId").as[String]) ~
					("coursierId" -> coursierId))))))
			.pause(1)
			.exec(http("Customer check coursier position")
				.get(s"$CustomerUrl/geolocation/" + "${orderId}")
				.queryParam("orderId", session => session("orderId").as[String])
				.queryParam("lat", "21")
				.queryParam("long", "24"))
			.pause(1)
		}



	setUp(order.inject(rampUsers(1) during (1 seconds))).protocols(httpConfig)
}