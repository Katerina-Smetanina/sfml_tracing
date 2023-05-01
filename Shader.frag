uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_pos;
uniform float u_time;
uniform sampler2D u_sample;
uniform float u_sample_part;
uniform vec2 u_seed1;


const float MAX_DIST = 9999.0;
const int MAX_REF = 5;
vec3 light = normalize(vec3(-0.5, 0.25, -1.0));


float random (vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 randomOnSphere(vec2 st) {
	vec3 rand = vec3(random(st), random(st + vec2(1.0)), random(st + vec2(10.0)));
	float theta = rand.x * 2.0 * 3.14159265;
	float v = rand.y;
	float phi = acos(2.0 * v - 1.0);
	float r = pow(rand.z, 1.0 / 3.0);
	float x = r * sin(phi) * cos(theta);
	float y = r * sin(phi) * sin(theta);
	float z = r * cos(phi);
	return vec3(x, y, z);
}


mat2 rotation(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, -s, s, c);
}


// Sphera

vec2 sphIntersect(in vec3 ro, in vec3 rd, float ra) {
	float b = dot(ro, rd);
	float c = dot(ro, ro) - ra * ra;
	float h = b * b - c;

	if(h < 0.0) 
		return vec2(-1.0);

	h = sqrt(h);
	return vec2(-b - h, -b + h);
}
//Cube

vec2 boxIntersect(in vec3 ro, in vec3 rd, in vec3 rad, out vec3 oN)  {
	vec3 m = 1.0 / rd;
	vec3 n = m * ro;
	vec3 k = abs(m) * rad;
	vec3 t1 = -n - k;
	vec3 t2 = -n + k;
	float tN = max(max(t1.x, t1.y), t1.z);
	float tF = min(min(t2.x, t2.y), t2.z);
	if(tN > tF || tF < 0.0) return vec2(-1.0);
	oN = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
	return vec2(tN, tF);
}
//Plane

float plaIntersect(in vec3 ro, in vec3 rd, in vec4 p) {
	return -(dot(ro, p.xyz) + p.w) / dot(rd, p.xyz);
}

//SKY

 vec3 getSky(vec3 rd){
	vec3 color = vec3(0.3, 0.6, 1.0);
	vec3 sun = vec3(0.95, 0.9, 1.0);
	sun = sun * max(0.0, pow(dot(rd, light), 256.0));
	color =color * max(0.0, dot(light, vec3(0.0, 0.0, -1.0)));
	return clamp(sun + (color*0.01), 0.0, 1.0);	
 }

vec4 castRay(inout vec3 ro,inout vec3 rd) {
	vec2 minIt = vec2(MAX_DIST);
	vec2 it;
	vec3 n;
	vec4 color;

	mat2x4 spheres[4];
	spheres[0][0] = vec4(0.0, -1.0, 0.0, 1.0);
	spheres[0][1] = vec4(1.0, 0.2, 0.1, 1.0);
	spheres[1][0] = vec4(10.0, 3.0, -0.25, 2.0);
	spheres[1][1] = vec4(1.0, 1.0, 1.0, 0.0);
	spheres[2][0] = vec4(5.0, 7.0, -0.01, 1.0);
	spheres[2][1] = vec4(1.0, 1.0, 1.0, -1.0);
	spheres[3][0] = vec4(1.0, -7.0, -0.01, 0.5);
	spheres[3][1] = vec4(1.0, 0.0, 1.0, -2.0);

	for(int i = 0; i < spheres.length(); i++) 
	{
		it = sphIntersect(ro - spheres[i][0].xyz, rd, spheres[i][0].w);
		if(it.x > 0.0 && it.x < minIt.x) {
			minIt = it;
			vec3 itPos = ro + rd * it.x;
			n = normalize(itPos - spheres[i][0].xyz);
			color = spheres[i][1];
	}


	vec3 boxN;
	vec3 boxPos = vec3(0.0, 2.0, 0.0);
	it = boxIntersect(ro - boxPos, rd, vec3(1.0), boxN);
	if(it.x > 0.0 && it.x < minIt.x) {
		minIt = it;
		n = boxN;
		color = vec4(0.4, 0.6, 0.8, 0.2);
		
	}


	vec3 boxM;
	boxPos = vec3(0.0, 9.0, 0.0);
	it = boxIntersect(ro - boxPos, rd, vec3(1.0), boxM);
	if(it.x > 0.0 && it.x < minIt.x) {
		minIt = it;
		n = boxN;
		color = vec4(0.4, 0.6, 0.8, 1.0);
		
	}


	vec3 planeNormal = vec3(0.0, 0.0, -1.0);
	it = plaIntersect(ro, rd, vec4(planeNormal, 1.0));
	if(it.x > 0.0 && it.x < minIt.x) {
		minIt = it;
		n = planeNormal;
		color = vec4(0.9, 0.9, 0.9, 0.01);
	}

	if(minIt.x == MAX_DIST) return vec4(getSky(rd),-2.0);
	if(color.a == -2.0) return color;
	if(color.a < 0.0) {
		ro += rd * (minIt.y + 0.001);
		rd = refract(rd, n, 1.0 / (1.0 - color.a));
		return color;
	}

		//свет
    vec3 itPos = ro + rd * it.x;
	vec3 r = randomOnSphere(itPos.xy + itPos.zz + u_seed1);
	vec3 diffuse = normalize(r * dot(r, n));
	vec3 reflected = reflect(rd, n);
	ro = ro + rd * (minIt.x - 0.001);
	rd = mix(diffuse, reflected, color.a);
	return color;
}
}

vec3 traceRay(vec3 ro, vec3 rd) {
    vec3 color = vec3(1.0);
	for(int i = 0; i < MAX_REF; i++){
		vec4 refCol = castRay(ro, rd);
		color *= refCol.rgb;
		if(refCol.a == -2.0) return color;
	}
	return vec3(0.0);
}

void main() {
	vec2 uv = (gl_TexCoord[0].xy - 0.5) * u_resolution / u_resolution.x;
	vec3 rayOrigin = u_pos;
	vec3 rayDirection = normalize(vec3(1.0, uv));

	rayDirection.zx *= rotation(-u_mouse.y);
	rayDirection.xy *= rotation(u_mouse.x);

	//switch day/night

	light = normalize(vec3(sin(u_time * 1), 0.75, cos(u_time * 0.25) - 0.9));
    vec3 color = vec3(0.0);
	int samples = 4;
	for(int i = 0; i < samples; i++) {
		color += traceRay(rayOrigin, rayDirection);
	}
	color /= samples;
	float white = 20.0;
	color *= white * 16.0;
	color = (color * (1.0 + color / white / white)) / (1.0 + color);
	vec3 sampleCol = texture(u_sample, gl_TexCoord[0].xy).rgb;
	color = mix(sampleCol, color, u_sample_part);

	gl_FragColor = vec4(color, 1.0);
}